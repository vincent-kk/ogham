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
    expect(paths.pluginCache("cogair")).toBe(
      join(homedir(), ".claude", "plugins", "cogair"),
    );
  });

  it("pluginCache(pkg, version) appends version", () => {
    expect(paths.pluginCache("cogair", "0.2.1")).toBe(
      join(homedir(), ".claude", "plugins", "cogair", "0.2.1"),
    );
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
