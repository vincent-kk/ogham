import { homedir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { detectHost } from "../detectHost.js";
import { locatePluginRoot } from "../locatePluginRoot.js";
import { pluginRoot } from "../pluginRoot.js";
import { projectRoot, tryProjectRoot } from "../projectRoot.js";
import { rememberProjectRoot, resetProjectRoot } from "../projectRootMemo.js";

// Stubbed so the plugin-root fallback is asserted as a decision, not as an accident of
// where the test file happens to sit on disk. The walk itself is covered by
// locatePluginRoot.test.ts against a fixture tree.
vi.mock("../locatePluginRoot.js", () => ({ locatePluginRoot: vi.fn() }));
const locate = vi.mocked(locatePluginRoot);

const PLUGIN_DIR = "/install/plugins/deilen";
const WORKSPACE = "/Users/vincent/Workspace/app";

beforeEach(() => {
  delete process.env.OGHAM_HOST;
  delete process.env.CLAUDE_PLUGIN_ROOT;
  resetProjectRoot();
  locate.mockReturnValue(null);
  vi.spyOn(process, "cwd").mockReturnValue(PLUGIN_DIR);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetProjectRoot();
});

describe("detectHost", () => {
  it("reads claude from the absence of a marker, since Claude ships .mcp.json unmodified", () => {
    expect(detectHost()).toBe("claude");
  });

  it("resolves an unrecognised marker to unknown rather than defaulting to claude", () => {
    process.env.OGHAM_HOST = "someFutureHost";
    expect(detectHost()).toBe("unknown");
  });
});

describe("pluginRoot", () => {
  it("prefers CLAUDE_PLUGIN_ROOT on every host — Codex injects it into hook processes, whose cwd is the session", () => {
    process.env.OGHAM_HOST = "codex";
    process.env.CLAUDE_PLUGIN_ROOT = PLUGIN_DIR;
    vi.spyOn(process, "cwd").mockReturnValue(WORKSPACE);
    expect(pluginRoot()).toBe(PLUGIN_DIR);
  });

  it("falls back to cwd on codex, where the adapter pins the MCP server's cwd to the plugin root", () => {
    process.env.OGHAM_HOST = "codex";
    expect(pluginRoot()).toBe(PLUGIN_DIR);
  });

  it("asks the filesystem where it is on agy, whose mcp_config.json has no cwd field to pin", () => {
    process.env.OGHAM_HOST = "agy";
    locate.mockReturnValue(PLUGIN_DIR);
    expect(pluginRoot()).toBe(PLUGIN_DIR);
    expect(process.cwd).not.toHaveBeenCalled();
  });

  it("returns null when no channel answers and no manifest sits above the module", () => {
    process.env.OGHAM_HOST = "agy";
    expect(pluginRoot()).toBeNull();
  });

  it("never mistakes cwd for the plugin on claude — cwd is the workspace there", () => {
    expect(pluginRoot()).toBeNull();
    expect(process.cwd).not.toHaveBeenCalled();
  });
});

describe("projectRoot on claude", () => {
  it("resolves to cwd, unchanged from before host-paths existed", () => {
    vi.spyOn(process, "cwd").mockReturnValue(WORKSPACE);
    expect(projectRoot()).toBe(WORKSPACE);
  });

  it("lets an explicit argument win, matching the input.path ?? process.cwd() precedent", () => {
    expect(projectRoot("/explicit/root")).toBe("/explicit/root");
  });

  it("does not let one call's explicit argument leak into the next", () => {
    vi.spyOn(process, "cwd").mockReturnValue(WORKSPACE);
    projectRoot("/explicit/root");
    expect(projectRoot()).toBe(WORKSPACE);
  });

  it("rejects a relative argument here too, rather than writing outside the workspace", () => {
    expect(() => projectRoot("../evil")).toThrow(/absolute/);
  });
});

describe("projectRoot off claude", () => {
  beforeEach(() => {
    process.env.OGHAM_HOST = "codex";
  });

  it("throws instead of falling back to cwd, which is the plugin install directory", () => {
    expect(() => projectRoot()).toThrow(/project_root/);
    expect(() => projectRoot()).not.toThrow(new RegExp(PLUGIN_DIR));
  });

  it("reuses the workspace a previous call supplied — one server process serves one workspace", () => {
    expect(projectRoot(WORKSPACE)).toBe(WORKSPACE);
    expect(projectRoot()).toBe(WORKSPACE);
  });

  it("rejects a relative path outright — resolving it would land in the plugin directory", () => {
    expect(() => projectRoot("../myrepo")).toThrow(/absolute/);
    expect(() => rememberProjectRoot("./src")).toThrow(/absolute/);
    expect(tryProjectRoot("./src")).toBeNull();
  });

  it("canonicalises the supplied path so two spellings hash to one project", () => {
    expect(projectRoot(`${WORKSPACE}/`)).toBe(WORKSPACE);
    expect(projectRoot(`${WORKSPACE}/sub/..`)).toBe(WORKSPACE);
  });

  it("expands a leading ~, the spelling the Codex TUI shows the model", () => {
    expect(projectRoot("~/Workspace/app")).toBe(
      join(homedir(), "Workspace", "app"),
    );
    expect(projectRoot("~")).toBe(homedir());
  });

  it("still rejects ~user, which only a shell can resolve — and says so", () => {
    expect(() => projectRoot("~someone/app")).toThrow(/~user/);
    expect(tryProjectRoot("~someone/app")).toBeNull();
  });

  it("hands lifecycle callers null so they skip rather than sweep the wrong root", () => {
    expect(tryProjectRoot()).toBeNull();
  });

  it("also withholds a fallback on an unknown host marker", () => {
    process.env.OGHAM_HOST = "someFutureHost";
    expect(tryProjectRoot()).toBeNull();
  });
});

describe("tryProjectRoot with a caller-supplied root", () => {
  it("honours an absolute argument on claude, as filid's bootSweep relies on", () => {
    expect(tryProjectRoot("/proj/lifecycle")).toBe("/proj/lifecycle");
  });

  it("returns null for an unusable argument instead of silently sweeping cwd", () => {
    expect(tryProjectRoot("invalid")).toBeNull();
  });
});
