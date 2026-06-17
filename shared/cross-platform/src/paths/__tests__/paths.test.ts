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
