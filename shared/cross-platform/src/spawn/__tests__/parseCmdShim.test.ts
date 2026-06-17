import { win32 } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCmdShim } from "../parseCmdShim.js";

const NPM_DIR = String.raw`C:\Users\me\AppData\Roaming\npm`;
const PLUGIN_DIR = String.raw`C:\plugins\cennad`;
const BIN_DIR = String.raw`C:\tools\bin`;

/** npm `cmd-shim` output for a shebang script (subroutine `_prog` form). */
function npmShim(relEntry: string, flags = ""): string {
  const progCall = flags ? `"%_prog%" ${flags} ` : `"%_prog%"  `;
  return String.raw`@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /b
:start
SETLOCAL
CALL :find_dp0

IF EXIST "%dp0%\node.exe" (
  SET "_prog=%dp0%\node.exe"
) ELSE (
  SET "_prog=node"
  SET PATHEXT=%PATHEXT:;.JS;=;%
)

endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & ${progCall}"%dp0%${"\\"}${relEntry}" %*
`;
}

describe("parseCmdShim — basic", () => {
  it("extracts the entry from an npm cmd-shim (node CLI)", () => {
    const result = parseCmdShim(
      npmShim(String.raw`node_modules\@google\gemini-cli\dist\index.js`),
      NPM_DIR,
    );
    expect(result).toEqual({
      nodeArgs: [],
      entry: win32.join(
        NPM_DIR,
        "node_modules/@google/gemini-cli/dist/index.js",
      ),
    });
  });

  it("extracts the entry from a self-generated %~dp0 shim", () => {
    const shim = String.raw`@echo off
"%~dp0node.exe" "%~dp0server.cjs" %*
`;
    expect(parseCmdShim(shim, PLUGIN_DIR)).toEqual({
      nodeArgs: [],
      entry: win32.join(PLUGIN_DIR, "server.cjs"),
    });
  });

  it("returns null for a compiled-binary shim that never launches node", () => {
    const shim = String.raw`@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /b
:start
SETLOCAL
CALL :find_dp0
"%dp0%\node_modules\esbuild\bin\esbuild.exe" %*
`;
    expect(parseCmdShim(shim, NPM_DIR)).toBeNull();
  });
});

describe("parseCmdShim — complex", () => {
  it("substitutes %~dp0 used directly (no SET dp0 indirection)", () => {
    const shim = String.raw`@echo off
"%~dp0node.exe" "%~dp0lib\agy.js" %*
`;
    expect(parseCmdShim(shim, BIN_DIR)?.entry).toBe(
      win32.join(BIN_DIR, "lib/agy.js"),
    );
  });

  it("normalises a legacy inline-IF shim with %~dp0\\..\\ relative path", () => {
    const shim = String.raw`@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\lib\cli.js" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\..\lib\cli.js" %*
)
`;
    expect(parseCmdShim(shim, BIN_DIR)?.entry).toBe(
      win32.normalize(String.raw`C:\tools\lib\cli.js`),
    );
  });

  it("handles a .mjs entry", () => {
    const result = parseCmdShim(npmShim(String.raw`dist\main.mjs`), NPM_DIR);
    expect(result?.entry).toBe(win32.join(NPM_DIR, "dist/main.mjs"));
  });

  it("preserves node flags as nodeArgs", () => {
    const result = parseCmdShim(
      npmShim(String.raw`dist\cli.js`, "--enable-source-maps"),
      NPM_DIR,
    );
    expect(result?.nodeArgs).toEqual(["--enable-source-maps"]);
    expect(result?.entry).toBe(win32.join(NPM_DIR, "dist/cli.js"));
  });

  it("never mistakes the node.exe / %_prog% token for the entry", () => {
    const result = parseCmdShim(npmShim(String.raw`bin\run.js`), NPM_DIR);
    expect(result?.entry).toBe(win32.join(NPM_DIR, "bin/run.js"));
    expect(result?.entry).not.toMatch(/node\.exe/i);
  });

  it("normalises forward slashes in the relative path to win32 separators", () => {
    const shim = String.raw`@echo off
"%~dp0node.exe" "%~dp0lib/sub/hook.mjs" %*
`;
    expect(parseCmdShim(shim, PLUGIN_DIR)?.entry).toBe(
      win32.join(PLUGIN_DIR, "lib/sub/hook.mjs"),
    );
  });

  it("returns null when no execution line carries %*", () => {
    const shim = String.raw`@echo off
"%~dp0node.exe" "%~dp0cli.js"
`;
    expect(parseCmdShim(shim, PLUGIN_DIR)).toBeNull();
  });

  it("returns null for an absolute entry token without %dp0 anchoring", () => {
    const shim = String.raw`@echo off
"%~dp0node.exe" "C:\fixed\path\cli.js" %*
`;
    expect(parseCmdShim(shim, PLUGIN_DIR)).toBeNull();
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(parseCmdShim("", PLUGIN_DIR)).toBeNull();
    expect(parseCmdShim("   \r\n  \n", PLUGIN_DIR)).toBeNull();
  });

  it("parses shims with CRLF line endings", () => {
    const lf = npmShim(String.raw`dist\index.js`);
    const crlf = lf.replace(/\n/g, "\r\n");
    expect(parseCmdShim(crlf, NPM_DIR)?.entry).toBe(
      win32.join(NPM_DIR, "dist/index.js"),
    );
  });

  it("preserves deep scoped package paths", () => {
    const rel = String.raw`node_modules\@scope\pkg\a\b\c\entry.js`;
    expect(parseCmdShim(npmShim(rel), NPM_DIR)?.entry).toBe(
      win32.join(NPM_DIR, "node_modules/@scope/pkg/a/b/c/entry.js"),
    );
  });

  it("returns null when the only quoted path is a non-js script", () => {
    const shim = String.raw`@echo off
"%~dp0node.exe" "%~dp0run.sh" %*
`;
    expect(parseCmdShim(shim, PLUGIN_DIR)).toBeNull();
  });
});
