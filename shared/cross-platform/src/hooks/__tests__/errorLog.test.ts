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
});
