import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { selfProbe } from "../self-probe.js";

describe("selfProbe", () => {
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

  it("reports nodeOk: true on a working environment", async () => {
    const result = await selfProbe();
    expect(result.nodeOk).toBe(true);
  });

  it("flags pluginRootResolved: false when CLAUDE_PLUGIN_ROOT is unset", async () => {
    delete process.env.CLAUDE_PLUGIN_ROOT;
    const result = await selfProbe();
    expect(result.pluginRootResolved).toBe(false);
    expect(result.errors.some((e) => e.includes("CLAUDE_PLUGIN_ROOT"))).toBe(
      true,
    );
  });

  it("flags PATH empty when PATH is cleared", async () => {
    process.env.PATH = "";
    const result = await selfProbe({ spawnTimeoutMs: 500 });
    expect(result.pathLen).toBe(0);
    expect(result.errors.some((e) => e.includes("PATH"))).toBe(true);
  });

  it("returns a structured ProbeResult shape", async () => {
    process.env.CLAUDE_PLUGIN_ROOT = "/tmp/fake-root";
    const result = await selfProbe();
    expect(result).toHaveProperty("nodeOk");
    expect(result).toHaveProperty("gitOk");
    expect(result).toHaveProperty("pathLen");
    expect(result).toHaveProperty("pluginRootResolved");
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
