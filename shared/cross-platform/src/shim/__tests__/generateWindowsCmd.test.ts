import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateWindowsCmd } from "../generateWindowsCmd.js";

describe("generateWindowsCmd", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "xp-shim-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("creates the output file with CRLF line endings", () => {
    const out = join(tmp, "run-hook.cmd");
    generateWindowsCmd({
      outputPath: out,
      scriptRelativePath: "..\\libs\\run.cjs",
    });
    expect(existsSync(out)).toBe(true);
    const body = readFileSync(out, "utf8");
    expect(body).toContain("\r\n");
    expect(body.split("\r\n")[0]).toBe("@echo off");
  });

  it("uses node.exe by default when nodeRelativePath is omitted", () => {
    const out = join(tmp, "run-hook.cmd");
    generateWindowsCmd({
      outputPath: out,
      scriptRelativePath: "..\\libs\\run.cjs",
    });
    expect(readFileSync(out, "utf8")).toContain('"%~dp0node.exe"');
  });

  it("respects custom nodeRelativePath", () => {
    const out = join(tmp, "run-hook.cmd");
    generateWindowsCmd({
      outputPath: out,
      nodeRelativePath: "..\\..\\node\\node.exe",
      scriptRelativePath: "..\\libs\\run.cjs",
    });
    const body = readFileSync(out, "utf8");
    expect(body).toContain('"%~dp0..\\..\\node\\node.exe"');
    expect(body).toContain('"%~dp0..\\libs\\run.cjs"');
  });

  it("creates nested output directory if needed", () => {
    const out = join(tmp, "nested", "deeper", "run.cmd");
    generateWindowsCmd({
      outputPath: out,
      scriptRelativePath: "x.mjs",
    });
    expect(existsSync(out)).toBe(true);
  });
});
