import { resolve, sep } from "node:path";

import { Messages } from "../constants/messages.js";

/**
 * Resolve `filename` inside `outDir`, refusing any path that escapes the
 * declared directory (traversal / absolute / symlink-style). Returns the safe
 * absolute path.
 */
export function safeOutputPath(outDir: string, filename: string): string {
  const base = resolve(outDir);
  const target = resolve(base, filename);
  if (target !== base && !target.startsWith(base + sep)) {
    throw new Error(`${Messages.PATH_ESCAPE} (${filename})`);
  }
  return target;
}
