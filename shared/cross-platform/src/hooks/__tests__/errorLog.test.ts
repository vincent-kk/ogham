import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { logHookFailure } from "../errorLog.js";

describe("logHookFailure", () => {
  let tmp: string;
  let logFile: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "xp-errlog-"));
    logFile = join(tmp, "error-log.json");
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("creates the log file and appends an Error entry", () => {
    logHookFailure("test-pkg", "session-start", new Error("boom"), { logFile });
    expect(existsSync(logFile)).toBe(true);
    const data = JSON.parse(readFileSync(logFile, "utf8"));
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].hook).toBe("session-start");
    expect(data[0].error).toContain("boom");
    expect(data[0].timestamp).toBeDefined();
  });

  it("appends multiple entries in order", () => {
    logHookFailure("test-pkg", "h1", "first", { logFile });
    logHookFailure("test-pkg", "h2", "second", { logFile });
    const data = JSON.parse(readFileSync(logFile, "utf8"));
    expect(data).toHaveLength(2);
    expect(data[0].hook).toBe("h1");
    expect(data[1].hook).toBe("h2");
  });

  it("serialises non-Error values", () => {
    logHookFailure("test-pkg", "h", { reason: "boom" }, { logFile });
    const data = JSON.parse(readFileSync(logFile, "utf8"));
    expect(data[0].error).toContain("boom");
  });

  it("rotates oldest entries when exceeding 256 KB cap", () => {
    const huge = "x".repeat(300 * 1024);
    logHookFailure("test-pkg", "first", huge, { logFile });
    logHookFailure("test-pkg", "second", "small", { logFile });
    const raw = readFileSync(logFile, "utf8");
    const data = JSON.parse(raw);
    expect(data).toHaveLength(1);
    expect(data[0].hook).toBe("second");
  });

  it("default path follows the host-aware plugin cache — a Codex hook (PLUGIN_DATA) writes under ~/.codex, not ~/.claude", () => {
    // No logFile override: exercises defaultLogPath, which must route through pluginCache
    // rather than a hardcoded ~/.claude, so Codex hook state does not leak to the Claude root.
    const root = mkdtempSync(join(tmpdir(), "xp-codexhome-"));
    const origData = process.env.PLUGIN_DATA;
    const origCodex = process.env.CODEX_HOME;
    const origHost = process.env.OGHAM_HOST;
    process.env.PLUGIN_DATA = "1";
    process.env.CODEX_HOME = root;
    delete process.env.OGHAM_HOST;
    try {
      logHookFailure("errlog-pkg", "session-start", new Error("boom"));
      expect(
        existsSync(join(root, "plugins", "errlog-pkg", "error-log.json")),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
      if (origData === undefined) delete process.env.PLUGIN_DATA;
      else process.env.PLUGIN_DATA = origData;
      if (origCodex === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = origCodex;
      if (origHost === undefined) delete process.env.OGHAM_HOST;
      else process.env.OGHAM_HOST = origHost;
    }
  });
});
