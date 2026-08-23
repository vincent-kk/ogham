import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { Platform } from "../../../../types/enums.js";
import { buildRunEnv } from "../operations/buildRunEnv.js";

const workspace = {
  workspaceId: "ws_env",
  dir: "/tmp/ws_env",
  artifactsDir: "/tmp/ws_env/artifacts",
  dataDir: "/tmp/ws_env/data",
};

const packageRoot = fileURLToPath(new URL("../../../../../", import.meta.url));

function isolatedManagedLibrary(
  host: "claude" | "codex",
  overrides: Record<string, string | undefined>,
): string {
  const script = [
    'import { buildRunEnv } from "./src/mcp/tools/runR/operations/buildRunEnv.ts";',
    'const workspace = {workspaceId:"w",dir:"/tmp/w",artifactsDir:"/tmp/w/a",dataDir:"/tmp/w/d"};',
    'process.stdout.write(buildRunEnv(workspace, 1).R_STATISTICS_LIB ?? "");',
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

describe("buildRunEnv", () => {
  it("excludes non-allowlisted parent env vars (no secret leakage)", () => {
    process.env.FAKE_SECRET_TOKEN = "sk-leak";
    try {
      const env = buildRunEnv(workspace, 7);
      expect(env.FAKE_SECRET_TOKEN).toBeUndefined();
      expect(env.R_STATISTICS_ARTIFACTS_DIR).toBe(workspace.artifactsDir);
      expect(env.R_STATISTICS_SEED).toBe("7");
    } finally {
      delete process.env.FAKE_SECRET_TOKEN;
    }
  });

  it("sets the managed R library env used by Windows run_r and installs", () => {
    const env = buildRunEnv(workspace, undefined, Platform.Windows);
    expect(env.R_STATISTICS_LIB).toMatch(
      /[\\/]plugins[\\/]r-statistics[\\/]runtime[\\/]r-lib$/,
    );
    expect(env.R_LIBS_USER).toBe(env.R_STATISTICS_LIB);
  });

  it("does not override the existing R_LIBS_USER outside Windows", () => {
    const previous = process.env.R_LIBS_USER;
    process.env.R_LIBS_USER = "/Users/vincent/R/library";
    try {
      const env = buildRunEnv(workspace, undefined, Platform.Macos);
      expect(env.R_STATISTICS_LIB).toMatch(
        /[\\/]plugins[\\/]r-statistics[\\/]runtime[\\/]r-lib$/,
      );
      expect(env.R_LIBS_USER).toBe("/Users/vincent/R/library");
    } finally {
      if (previous === undefined) delete process.env.R_LIBS_USER;
      else process.env.R_LIBS_USER = previous;
    }
  });

  it("passes through Windows toolchain env vars without inheriting arbitrary vars", () => {
    const previous = {
      LOCALAPPDATA: process.env.LOCALAPPDATA,
      APPDATA: process.env.APPDATA,
      USERPROFILE: process.env.USERPROFILE,
      PROCESSOR_ARCHITECTURE: process.env.PROCESSOR_ARCHITECTURE,
      RANDOM_WINDOWS_SECRET: process.env.RANDOM_WINDOWS_SECRET,
    };
    process.env.LOCALAPPDATA = "C:\\Users\\vincent\\AppData\\Local";
    process.env.APPDATA = "C:\\Users\\vincent\\AppData\\Roaming";
    process.env.USERPROFILE = "C:\\Users\\vincent";
    process.env.PROCESSOR_ARCHITECTURE = "AMD64";
    process.env.RANDOM_WINDOWS_SECRET = "do-not-copy";
    try {
      const env = buildRunEnv(workspace, undefined);
      expect(env.LOCALAPPDATA).toBe(process.env.LOCALAPPDATA);
      expect(env.APPDATA).toBe(process.env.APPDATA);
      expect(env.USERPROFILE).toBe(process.env.USERPROFILE);
      expect(env.PROCESSOR_ARCHITECTURE).toBe(
        process.env.PROCESSOR_ARCHITECTURE,
      );
      expect(env.RANDOM_WINDOWS_SECRET).toBeUndefined();
    } finally {
      for (const [key, value] of Object.entries(previous))
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
  });

  it("passes through the toolchain/locale env R needs", () => {
    process.env.PATH = process.env.PATH ?? "/usr/bin";
    const env = buildRunEnv(workspace, undefined);
    expect(env.PATH).toBe(process.env.PATH);
    expect(env.LANG).toBeDefined();
  });

  it("uses the exact Claude config root even when it contains spaces", () => {
    const root = mkdtempSync(join(tmpdir(), "r stats claude "));
    try {
      expect(
        isolatedManagedLibrary("claude", {
          CLAUDE_CONFIG_DIR: root,
          CODEX_HOME: undefined,
        }),
      ).toContain(root);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  it("uses the exact Codex home even when it contains spaces", () => {
    const root = mkdtempSync(join(tmpdir(), "r stats codex "));
    try {
      expect(
        isolatedManagedLibrary("codex", {
          CODEX_HOME: root,
          CLAUDE_CONFIG_DIR: undefined,
        }),
      ).toContain(root);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  it("a clean Codex home never falls back to .claude", () => {
    const root = mkdtempSync(join(tmpdir(), "r-stats-clean-"));
    try {
      const library = isolatedManagedLibrary("codex", {
        HOME: root,
        CODEX_HOME: undefined,
        CLAUDE_CONFIG_DIR: undefined,
      });
      expect(library).toContain(join(root, ".codex"));
      expect(library).not.toContain(join(root, ".claude"));
    } finally {
      rmSync(root, { recursive: true });
    }
  });
});
