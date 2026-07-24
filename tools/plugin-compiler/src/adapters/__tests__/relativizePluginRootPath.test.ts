import { describe, expect, it } from "vitest";

import { relativizePluginRootPath } from "../utils/relativizePluginRootPath.js";

describe("relativizePluginRootPath", () => {
  // --- basic ---

  it("strips a leading plugin-root prefix", () => {
    expect(
      relativizePluginRootPath("${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"),
    ).toBe("bridge/mcp-server.cjs");
  });

  it("leaves an already-relative path untouched", () => {
    expect(relativizePluginRootPath("bridge/mcp-server.cjs")).toBe(
      "bridge/mcp-server.cjs",
    );
  });

  it("leaves a flag argument untouched", () => {
    expect(relativizePluginRootPath("--stdio")).toBe("--stdio");
  });

  // --- complex ---

  it("keeps every segment after the stripped prefix", () => {
    expect(relativizePluginRootPath("${CLAUDE_PLUGIN_ROOT}/a/b/c.js")).toBe(
      "a/b/c.js",
    );
  });

  it("throws when the variable is embedded mid-argument", () => {
    expect(() =>
      relativizePluginRootPath("--config=${CLAUDE_PLUGIN_ROOT}/c.json"),
    ).toThrow(/only portable as an args path prefix/);
  });

  it("throws when the variable appears a second time", () => {
    expect(() =>
      relativizePluginRootPath("${CLAUDE_PLUGIN_ROOT}/a/${CLAUDE_PLUGIN_ROOT}"),
    ).toThrow(/only portable as an args path prefix/);
  });

  it("does not strip a bare variable without a trailing slash", () => {
    expect(() => relativizePluginRootPath("${CLAUDE_PLUGIN_ROOT}")).toThrow();
  });
});
