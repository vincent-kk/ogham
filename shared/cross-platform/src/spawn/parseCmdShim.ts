import { win32 } from "node:path";

export interface ShimTarget {
  /** Flags passed to node before the entry script (e.g. `--max-old-space-size`). */
  nodeArgs: string[];
  /** Absolute win32 path to the JS entry the `.cmd`/`.bat` shim launches. */
  entry: string;
}

const QUOTED_TOKEN = /"([^"]*)"/g;
const DP0_TOKEN = /%~dp0%?|%dp0%/i;
const JS_ENTRY = /\.(?:c|m)?js$/i;
const FLAG = /^--?[A-Za-z]/;

/**
 * Decide whether a `.cmd` shim ultimately invokes node. npm's `cmd-shim`
 * emits `node.exe` / `SET "_prog=node"` / a bare `node` invocation for
 * shebang scripts, but writes a direct call for compiled binaries — those
 * must not be re-launched through node.
 */
function launchesNode(shimText: string): boolean {
  return (
    /node\.exe/i.test(shimText) ||
    /_prog\s*=\s*node\b/i.test(shimText) ||
    /(?:^|[\s"%\\/])node\s/im.test(shimText)
  );
}

function isNodeToken(token: string): boolean {
  return (
    token === "%_prog%" ||
    token === "node" ||
    /(?:^|[\\/])node\.exe$/i.test(token)
  );
}

/** Resolve `%dp0%` / `%~dp0%` / `%~dp0` against the shim directory. */
function substituteDp0(token: string, shimDir: string): string {
  const base = /[\\/]$/.test(shimDir) ? shimDir : `${shimDir}\\`;
  const expanded = token.replace(/%~dp0%?/gi, base).replace(/%dp0%/gi, base);
  return win32.normalize(expanded);
}

function extractNodeArgs(execLine: string, entryToken: string): string[] {
  const cut = execLine.indexOf(`"${entryToken}"`);
  if (cut < 0) return [];
  return execLine
    .slice(0, cut)
    .split(/\s+/)
    .filter((token) => FLAG.test(token));
}

/**
 * Parse a Windows `.cmd`/`.bat` shim into the node entry it launches, so the
 * caller can spawn `process.execPath` directly and bypass the cmd.exe wrapper
 * (which truncates multi-line arguments at the first newline).
 *
 * Returns `null` for any shim that is not an unambiguous node launcher; the
 * caller then falls back to its normal cross-spawn path.
 */
export function parseCmdShim(
  shimText: string,
  shimDir: string,
): ShimTarget | null {
  if (!launchesNode(shimText)) return null;

  const execLines = shimText
    .split(/\r?\n/)
    .filter((line) => line.includes("%*"));
  for (const line of execLines) {
    const tokens = [...line.matchAll(QUOTED_TOKEN)].map((match) => match[1]);
    for (const token of tokens) {
      if (isNodeToken(token) || !DP0_TOKEN.test(token)) continue;
      const entry = substituteDp0(token, shimDir);
      if (!JS_ENTRY.test(entry)) continue;
      return { nodeArgs: extractNodeArgs(line, token), entry };
    }
  }
  return null;
}
