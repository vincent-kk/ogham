import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { selfProbe } from "../selfProbe.js";
import { selfProbeHook } from "../probe/selfProbeHook.js";

describe("selfProbeHook", () => {
  let originalPluginRoot: string | undefined;
  let originalPath: string | undefined;

  beforeEach(() => {
    originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
    originalPath = process.env.PATH;
  });

  afterEach(() => {
    if (originalPluginRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
    else process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
  });

  it("reports the same healthy node and git checks as the general probe", async () => {
    const [general, hook] = await Promise.all([
      selfProbe({ writeLog: false }),
      selfProbeHook({ writeLog: false }),
    ]);

    expect(hook.nodeOk).toBe(general.nodeOk);
    expect(hook.gitOk).toBe(general.gitOk);
    expect(hook.pathLen).toBe(general.pathLen);
  });

  it("preserves the plugin-root diagnostic", async () => {
    delete process.env.CLAUDE_PLUGIN_ROOT;

    const result = await selfProbeHook();

    expect(result.pluginRootResolved).toBe(false);
    expect(result.errors).toContain("CLAUDE_PLUGIN_ROOT not set");
  });

  it("degrades missing PATH executables to structured failures", async () => {
    process.env.PATH = "";

    const result = await selfProbeHook({ spawnTimeoutMs: 500 });

    expect(result).toMatchObject({
      nodeOk: false,
      gitOk: false,
      pathLen: 0,
    });
    expect(
      result.errors.some((error) => error.startsWith("node --version failed")),
    ).toBe(true);
    expect(
      result.errors.some((error) => error.startsWith("git --version failed")),
    ).toBe(true);
    expect(result.errors).toContain("PATH environment variable is empty");
  });

  it("returns the established ProbeResult fields", async () => {
    const result = await selfProbeHook();

    expect(result).toEqual({
      nodeOk: expect.any(Boolean),
      gitOk: expect.any(Boolean),
      pathLen: expect.any(Number),
      pluginRootResolved: expect.any(Boolean),
      errors: expect.any(Array),
    });
  });
});
