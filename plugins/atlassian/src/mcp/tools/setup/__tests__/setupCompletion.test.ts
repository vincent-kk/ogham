// filid:contract AC-resolved-save-path
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openBrowser: vi.fn(),
  startSetupServer: vi.fn(),
}));

vi.mock("@ogham/cross-platform", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  openBrowser: mocks.openBrowser,
}));
vi.mock("../webServer/index.js", () => ({
  startSetupServer: mocks.startSetupServer,
}));

import { handleSetup } from "../setup.js";

const packageRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
);
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

function resolvedUserPath(
  host: "claude" | "codex",
  overrides: Record<string, string | undefined>,
): string {
  const script = [
    'import { configLayers } from "./src/core/configManager/utils/configLayers.ts";',
    "process.stdout.write(configLayers(null).user);",
  ].join("\n");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OGHAM_HOST: host,
    ...overrides,
  };
  for (const [key, value] of Object.entries(env))
    if (value === undefined) delete env[key];
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script],
    { cwd: packageRoot, env, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout;
}

describe("setup MCP completion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("waits for persistence and returns its exact config_path", async () => {
    let finish!: (value: {
      success: true;
      message: string;
      config_path: string;
    }) => void;
    const completion = new Promise<{
      success: true;
      message: string;
      config_path: string;
    }>((resolve) => (finish = resolve));
    mocks.startSetupServer.mockResolvedValue({
      url: "http://127.0.0.1:1234/?token=t",
      token: "t",
      close: vi.fn(),
      completion,
    });

    let settled = false;
    const resultPromise = handleSetup({}).then((result) => {
      settled = true;
      return result;
    });
    await vi.waitFor(() => expect(mocks.openBrowser).toHaveBeenCalledOnce());
    expect(settled).toBe(false);

    finish({
      success: true,
      message: "Configuration saved successfully",
      config_path: "/tmp/custom root/config.json",
    });
    await expect(resultPromise).resolves.toMatchObject({
      success: true,
      config_path: "/tmp/custom root/config.json",
    });
  });

  it("returns terminal failure without a success path", async () => {
    mocks.startSetupServer.mockResolvedValue({
      url: "http://127.0.0.1:1234/?token=t",
      token: "t",
      close: vi.fn(),
      completion: Promise.resolve({
        success: false,
        message: "Setup closed before configuration was saved",
      }),
    });

    const result = await handleSetup({});
    expect(result.success).toBe(false);
    expect(result).not.toHaveProperty("config_path");
  });

  it("setup skill reports only the MCP-owned config_path", () => {
    const reference = readFileSync(
      join(packageRoot, "skills", "setup", "references", "setup-flow.md"),
      "utf8",
    );
    expect(reference).toContain("config_path");
    expect(reference).not.toContain("~/.claude/plugins/atlassian");
  });
});

describe("setup config path by host", () => {
  it("uses the Claude config root selected by the shared resolver", () => {
    const root = mkdtempSync(join(tmpdir(), "atlassian claude "));
    roots.push(root);
    expect(
      resolvedUserPath("claude", {
        CLAUDE_CONFIG_DIR: root,
        CODEX_HOME: undefined,
      }),
    ).toMatch(new RegExp(`^${root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });

  it("uses the Codex home selected by the shared resolver", () => {
    const root = mkdtempSync(join(tmpdir(), "atlassian codex "));
    roots.push(root);
    expect(
      resolvedUserPath("codex", {
        CODEX_HOME: root,
        CLAUDE_CONFIG_DIR: undefined,
      }),
    ).toMatch(new RegExp(`^${root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });

  it("a clean Codex home never falls back to .claude", () => {
    const root = mkdtempSync(join(tmpdir(), "atlassian-clean-"));
    roots.push(root);
    const path = resolvedUserPath("codex", {
      // `os.homedir()` reads HOME on POSIX but USERPROFILE on Windows.
      HOME: root,
      USERPROFILE: root,
      CODEX_HOME: undefined,
      CLAUDE_CONFIG_DIR: undefined,
    });
    expect(path).toContain(join(root, ".codex"));
    expect(path).not.toContain(join(root, ".claude"));
  });
});
