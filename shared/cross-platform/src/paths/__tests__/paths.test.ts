import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { paths } from "../paths.js";

describe("paths", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  function stubPlatform(value: NodeJS.Platform) {
    Object.defineProperty(process, "platform", { value, configurable: true });
  }

  it("home() returns os.homedir()", () => {
    expect(paths.home()).toBe(homedir());
  });

  it("tmp() returns os.tmpdir()", () => {
    expect(paths.tmp()).toBe(tmpdir());
  });

  it("pluginCache(pkg) builds ~/.claude/plugins/<pkg>", () => {
    const originalEnv = process.env.CLAUDE_CONFIG_DIR;
    delete process.env.CLAUDE_CONFIG_DIR;
    try {
      expect(paths.pluginCache("cennad")).toBe(
        join(homedir(), ".claude", "plugins", "cennad"),
      );
    } finally {
      if (originalEnv !== undefined)
        process.env.CLAUDE_CONFIG_DIR = originalEnv;
    }
  });

  it("pluginCache(pkg, version) appends version", () => {
    const originalEnv = process.env.CLAUDE_CONFIG_DIR;
    delete process.env.CLAUDE_CONFIG_DIR;
    try {
      expect(paths.pluginCache("cennad", "0.2.1")).toBe(
        join(homedir(), ".claude", "plugins", "cennad", "0.2.1"),
      );
    } finally {
      if (originalEnv !== undefined)
        process.env.CLAUDE_CONFIG_DIR = originalEnv;
    }
  });

  it("pluginCache honors CLAUDE_CONFIG_DIR when set", () => {
    const originalEnv = process.env.CLAUDE_CONFIG_DIR;
    process.env.CLAUDE_CONFIG_DIR = join("/custom", "claude");
    try {
      expect(paths.pluginCache("filid")).toBe(
        join("/custom", "claude", "plugins", "filid"),
      );
    } finally {
      if (originalEnv === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = originalEnv;
    }
  });

  it("pluginCache targets ~/.codex on the codex host", () => {
    const origHost = process.env.OGHAM_HOST;
    const origCodex = process.env.CODEX_HOME;
    const origClaude = process.env.CLAUDE_CONFIG_DIR;
    process.env.OGHAM_HOST = "codex";
    delete process.env.CODEX_HOME;
    delete process.env.CLAUDE_CONFIG_DIR;
    try {
      expect(paths.pluginCache("filid")).toBe(
        join(homedir(), ".codex", "plugins", "filid"),
      );
    } finally {
      if (origHost === undefined) delete process.env.OGHAM_HOST;
      else process.env.OGHAM_HOST = origHost;
      if (origCodex === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = origCodex;
      if (origClaude === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = origClaude;
    }
  });

  it("pluginCache honors CODEX_HOME on the codex host", () => {
    const origHost = process.env.OGHAM_HOST;
    const origCodex = process.env.CODEX_HOME;
    process.env.OGHAM_HOST = "codex";
    process.env.CODEX_HOME = join("/custom", "codex");
    try {
      expect(paths.pluginCache("filid")).toBe(
        join("/custom", "codex", "plugins", "filid"),
      );
    } finally {
      if (origHost === undefined) delete process.env.OGHAM_HOST;
      else process.env.OGHAM_HOST = origHost;
      if (origCodex === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = origCodex;
    }
  });

  it("pluginCache targets ~/.codex when a hook carries Codex's PLUGIN_DATA (no OGHAM_HOST)", () => {
    // Codex injects PLUGIN_DATA into hook processes but never OGHAM_HOST (that marker
    // rides only on MCP declarations). Without honoring PLUGIN_DATA, hook-written state
    // silently leaks to ~/.claude under Codex.
    const origHost = process.env.OGHAM_HOST;
    const origData = process.env.PLUGIN_DATA;
    const origCodex = process.env.CODEX_HOME;
    const origClaude = process.env.CLAUDE_CONFIG_DIR;
    delete process.env.OGHAM_HOST;
    process.env.PLUGIN_DATA = join(homedir(), ".codex", "plugins", "data", "x");
    delete process.env.CODEX_HOME;
    delete process.env.CLAUDE_CONFIG_DIR;
    try {
      expect(paths.pluginCache("imbas")).toBe(
        join(homedir(), ".codex", "plugins", "imbas"),
      );
    } finally {
      if (origHost === undefined) delete process.env.OGHAM_HOST;
      else process.env.OGHAM_HOST = origHost;
      if (origData === undefined) delete process.env.PLUGIN_DATA;
      else process.env.PLUGIN_DATA = origData;
      if (origCodex === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = origCodex;
      if (origClaude === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = origClaude;
    }
  });

  it("pluginCache stays on ~/.claude when neither OGHAM_HOST nor PLUGIN_DATA is present", () => {
    // Claude sets neither marker — its state paths must not move.
    const origHost = process.env.OGHAM_HOST;
    const origData = process.env.PLUGIN_DATA;
    const origClaude = process.env.CLAUDE_CONFIG_DIR;
    delete process.env.OGHAM_HOST;
    delete process.env.PLUGIN_DATA;
    delete process.env.CLAUDE_CONFIG_DIR;
    try {
      expect(paths.pluginCache("cennad")).toBe(
        join(homedir(), ".claude", "plugins", "cennad"),
      );
    } finally {
      if (origHost === undefined) delete process.env.OGHAM_HOST;
      else process.env.OGHAM_HOST = origHost;
      if (origData === undefined) delete process.env.PLUGIN_DATA;
      else process.env.PLUGIN_DATA = origData;
      if (origClaude === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = origClaude;
    }
  });

  it("normalize converts backslashes to forward slashes", () => {
    expect(paths.normalize("a\\b\\c")).toBe("a/b/c");
    expect(paths.normalize("C:\\Users\\test")).toBe("C:/Users/test");
  });

  it("normalize leaves forward slashes unchanged", () => {
    expect(paths.normalize("a/b/c")).toBe("a/b/c");
  });

  it("configDir(scope) includes the scope name on host platform", () => {
    stubPlatform("darwin");
    expect(paths.configDir("scope-test")).toContain("scope-test");
  });

  it("cacheDir(scope) includes the scope name on host platform", () => {
    stubPlatform("darwin");
    expect(paths.cacheDir("scope-test")).toContain("scope-test");
  });
});
