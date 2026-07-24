import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resetProjectRoot } from "@ogham/cross-platform/host-paths";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  contractScriptPath,
  inputDataRoot,
  R_STATISTICS_HOME,
} from "../paths.js";

/** This checkout's r-statistics package — the layout every install reproduces. */
const PLUGIN_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

beforeEach(() => {
  delete process.env.OGHAM_HOST;
  delete process.env.CLAUDE_PLUGIN_ROOT;
  delete process.env.R_STATISTICS_DATA_ROOT;
  resetProjectRoot();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.OGHAM_HOST;
  delete process.env.CLAUDE_PLUGIN_ROOT;
  delete process.env.R_STATISTICS_DATA_ROOT;
  resetProjectRoot();
});

describe("contractScriptPath", () => {
  it("resolves the R execution contract inside the plugin the host named", () => {
    process.env.CLAUDE_PLUGIN_ROOT = PLUGIN_ROOT;

    expect(contractScriptPath()).toBe(
      join(PLUGIN_ROOT, "shared", "contract.R"),
    );
  });

  it("finds a contract that is really there — run_r sources it silently, so a wrong path fails without a word", () => {
    process.env.CLAUDE_PLUGIN_ROOT = PLUGIN_ROOT;

    expect(existsSync(contractScriptPath())).toBe(true);
  });

  it("resolves it from the cwd on Codex, which the adapter pins to the plugin root", () => {
    process.env.OGHAM_HOST = "codex";
    vi.spyOn(process, "cwd").mockReturnValue(PLUGIN_ROOT);

    expect(contractScriptPath()).toBe(
      join(PLUGIN_ROOT, "shared", "contract.R"),
    );
    expect(existsSync(contractScriptPath())).toBe(true);
  });

  it("falls back to the conventional home only when no channel names a plugin root", () => {
    expect(contractScriptPath()).toBe(
      join(R_STATISTICS_HOME, "shared", "contract.R"),
    );
  });
});

describe("inputDataRoot", () => {
  it("takes the dedicated data root when one is configured", () => {
    process.env.R_STATISTICS_DATA_ROOT = "/data/lake";

    expect(inputDataRoot()).toBe("/data/lake");
  });

  it("refuses to guess an allow-root off Claude — the plugin folder is not the user's data", () => {
    process.env.OGHAM_HOST = "codex";

    expect(() => inputDataRoot()).toThrow(/project_root/);
  });
});
