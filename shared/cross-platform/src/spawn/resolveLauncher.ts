import { existsSync, readFileSync } from "node:fs";
import { win32 } from "node:path";
import which from "which";
import { parseCmdShim } from "./parseCmdShim.js";

export interface Launcher {
  /** Executable to spawn directly, bypassing the cmd.exe wrapper. */
  command: string;
  /** Args inserted before the caller's args (node flags + entry script). */
  prependArgs: string[];
}

const DIRECT_EXEC = /\.(?:exe|com)$/i;
const CMD_SHIM = /\.(?:cmd|bat)$/i;

/**
 * On Windows, resolve a bin name to a launcher that avoids the cmd.exe wrapper
 * cross-spawn uses for `.cmd`/`.bat` shims. That wrapper passes the command
 * line verbatim to cmd.exe, which truncates any argument at its first newline;
 * spawning the resolved `.exe` — or the shim's node entry — directly preserves
 * multi-line arguments.
 *
 * Returns null off Windows, when the bin cannot be resolved, or when a shim is
 * not an unambiguous node launcher. The caller then keeps its normal
 * cross-spawn path unchanged, so non-Windows behaviour never changes.
 */
export function resolveLauncher(
  bin: string,
  options: { env?: NodeJS.ProcessEnv } = {},
): Launcher | null {
  if (process.platform !== "win32") return null;

  const resolved = resolveBin(bin, options.env);
  if (!resolved) return null;

  if (DIRECT_EXEC.test(resolved)) return { command: resolved, prependArgs: [] };

  if (CMD_SHIM.test(resolved)) return resolveShimLauncher(resolved);

  return null;
}

function resolveBin(bin: string, env?: NodeJS.ProcessEnv): string | null {
  try {
    return which.sync(bin, {
      nothrow: true,
      path: env?.PATH ?? env?.Path ?? process.env.PATH,
    });
  } catch {
    return null;
  }
}

function resolveShimLauncher(shimPath: string): Launcher | null {
  let shimText: string;
  try {
    shimText = readFileSync(shimPath, "utf8");
  } catch {
    return null;
  }
  const target = parseCmdShim(shimText, win32.dirname(shimPath));
  if (!target || !existsSync(target.entry)) return null;
  return {
    command: process.execPath,
    prependArgs: [...target.nodeArgs, target.entry],
  };
}
