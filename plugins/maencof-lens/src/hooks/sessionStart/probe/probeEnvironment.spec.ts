import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { probeEnvironment } from "./probeEnvironment.js";

describe("probeEnvironment", () => {
  let originalPluginRoot: string | undefined;
  let originalPath: string | undefined;

  beforeEach(() => {
    originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
    originalPath = process.env.PATH;
  });

  afterEach(() => {
    if (originalPluginRoot !== undefined)
      process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
    else delete process.env.CLAUDE_PLUGIN_ROOT;
    if (originalPath !== undefined) process.env.PATH = originalPath;
    else delete process.env.PATH;
  });

  it("reports nodeOk: true under a running node runtime", () => {
    expect(probeEnvironment().nodeOk).toBe(true);
  });

  it("flags pluginRootResolved: false when CLAUDE_PLUGIN_ROOT is unset", () => {
    delete process.env.CLAUDE_PLUGIN_ROOT;
    const result = probeEnvironment();
    expect(result.pluginRootResolved).toBe(false);
    expect(result.errors.some((e) => e.includes("CLAUDE_PLUGIN_ROOT"))).toBe(
      true,
    );
  });

  it("flags PATH empty when PATH is cleared", () => {
    process.env.PATH = "";
    delete process.env.Path;
    const result = probeEnvironment();
    expect(result.pathLen).toBe(0);
    expect(result.errors.some((e) => e.includes("PATH"))).toBe(true);
  });

  it("returns a spawn-free shape without gitOk", () => {
    const result = probeEnvironment();
    expect(result).toHaveProperty("nodeOk");
    expect(result).toHaveProperty("pathLen");
    expect(result).toHaveProperty("pluginRootResolved");
    expect(result).not.toHaveProperty("gitOk");
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
