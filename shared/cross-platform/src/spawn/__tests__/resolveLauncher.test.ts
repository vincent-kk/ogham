import { existsSync, readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveLauncher } from "../resolveLauncher.js";

const { whichSync } = vi.hoisted(() => ({
  whichSync: vi.fn<(cmd: string, opts?: unknown) => string | null>(),
}));
vi.mock("which", () => ({ default: { sync: whichSync } }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));

const mockExists = vi.mocked(existsSync);
const mockRead = vi.mocked(readFileSync);

const realPlatform = process.platform;
function setPlatform(value: string): void {
  Object.defineProperty(process, "platform", { value, configurable: true });
}

/** npm cmd-shim body launching node against `%dp0%\<rel>` (with `prog` flags). */
function nodeShim(rel: string, flags = ""): string {
  const prog = flags ? `"%_prog%" ${flags} ` : `"%_prog%" `;
  return [
    "@ECHO off",
    'IF EXIST "%dp0%\\node.exe" (',
    '  SET "_prog=%dp0%\\node.exe"',
    ") ELSE (",
    '  SET "_prog=node"',
    ")",
    `endLocal & ${prog}"%dp0%\\${rel}" %*`,
  ].join("\r\n");
}

beforeEach(() => {
  vi.clearAllMocks();
  setPlatform("win32");
});

afterAll(() => {
  setPlatform(realPlatform);
});

describe("resolveLauncher — basic", () => {
  it("runs a resolved .exe directly with no prepended args", () => {
    whichSync.mockReturnValue(String.raw`C:\tools\codex.exe`);
    expect(resolveLauncher("codex")).toEqual({
      command: String.raw`C:\tools\codex.exe`,
      prependArgs: [],
    });
    expect(mockRead).not.toHaveBeenCalled();
  });

  it("rewrites a node .cmd shim to execPath + entry", () => {
    whichSync.mockReturnValue(String.raw`C:\npm\gemini.cmd`);
    mockRead.mockReturnValue(nodeShim(String.raw`node_modules\g\cli.js`));
    mockExists.mockReturnValue(true);
    expect(resolveLauncher("gemini")).toEqual({
      command: process.execPath,
      prependArgs: [String.raw`C:\npm\node_modules\g\cli.js`],
    });
  });

  it("returns null on non-Windows platforms without touching the filesystem", () => {
    setPlatform("darwin");
    whichSync.mockReturnValue(String.raw`C:\npm\gemini.cmd`);
    expect(resolveLauncher("gemini")).toBeNull();
    expect(whichSync).not.toHaveBeenCalled();
  });
});

describe("resolveLauncher — complex", () => {
  it("returns null when the bin cannot be resolved", () => {
    whichSync.mockReturnValue(null);
    expect(resolveLauncher("ghost")).toBeNull();
  });

  it("returns null when which throws", () => {
    whichSync.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(resolveLauncher("gemini")).toBeNull();
  });

  it("falls back to null for a compiled-binary .cmd that never launches node", () => {
    whichSync.mockReturnValue(String.raw`C:\npm\esbuild.cmd`);
    mockRead.mockReturnValue(
      '@ECHO off\r\n"%dp0%\\node_modules\\esbuild\\esbuild.exe" %*',
    );
    expect(resolveLauncher("esbuild")).toBeNull();
  });

  it("returns null when the shim entry does not exist on disk", () => {
    whichSync.mockReturnValue(String.raw`C:\npm\gemini.cmd`);
    mockRead.mockReturnValue(nodeShim(String.raw`dist\cli.js`));
    mockExists.mockReturnValue(false);
    expect(resolveLauncher("gemini")).toBeNull();
  });

  it("returns null when the shim file cannot be read", () => {
    whichSync.mockReturnValue(String.raw`C:\npm\gemini.cmd`);
    mockRead.mockImplementation(() => {
      throw new Error("EACCES");
    });
    expect(resolveLauncher("gemini")).toBeNull();
  });

  it("returns null for a resolved path with an unhandled extension", () => {
    whichSync.mockReturnValue(String.raw`C:\npm\gemini`);
    expect(resolveLauncher("gemini")).toBeNull();
    expect(mockRead).not.toHaveBeenCalled();
  });

  it("handles .bat shims like .cmd", () => {
    whichSync.mockReturnValue(String.raw`C:\npm\tool.bat`);
    mockRead.mockReturnValue(nodeShim(String.raw`bin\tool.js`));
    mockExists.mockReturnValue(true);
    expect(resolveLauncher("tool")).toEqual({
      command: process.execPath,
      prependArgs: [String.raw`C:\npm\bin\tool.js`],
    });
  });

  it("forwards env.PATH to which resolution", () => {
    whichSync.mockReturnValue(String.raw`C:\custom\codex.exe`);
    resolveLauncher("codex", { env: { PATH: String.raw`C:\custom` } });
    expect(whichSync).toHaveBeenCalledWith(
      "codex",
      expect.objectContaining({ path: String.raw`C:\custom` }),
    );
  });

  it("preserves node flags from the shim as leading prependArgs", () => {
    whichSync.mockReturnValue(String.raw`C:\npm\gemini.cmd`);
    mockRead.mockReturnValue(
      nodeShim(String.raw`cli.js`, "--enable-source-maps"),
    );
    mockExists.mockReturnValue(true);
    expect(resolveLauncher("gemini")).toEqual({
      command: process.execPath,
      prependArgs: ["--enable-source-maps", String.raw`C:\npm\cli.js`],
    });
  });
});
