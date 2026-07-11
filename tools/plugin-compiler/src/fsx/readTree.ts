import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { FileMap } from "../types/output.js";

/**
 * Read a file or directory tree into a FileMap. Keys are POSIX-separated paths
 * relative to `base` (defaults to `target`). A file target yields one entry; a
 * directory is walked recursively. A missing target yields an empty map.
 */
export function readTree(target: string, base: string = target): FileMap {
  const map: FileMap = new Map();
  collect(base, target, map);
  return map;
}

function collect(base: string, target: string, map: FileMap): void {
  let stat;
  try {
    stat = statSync(target);
  } catch {
    return;
  }
  if (stat.isFile()) {
    map.set(toPosix(relative(base, target)), readFileSync(target));
    return;
  }
  if (!stat.isDirectory()) return;
  for (const entry of readdirSync(target, { withFileTypes: true }))
    if (!isIgnored(entry.name)) collect(base, join(target, entry.name), map);
}

/**
 * Skip non-installable entries when walking a plugin tree:
 *  - OS cruft / state dirs (`.DS_Store`, `.omc`, `.git`, node_modules — dot-prefixed).
 *  - FCA governance docs (`INTENT.md`, `DETAIL.md`) — repo-internal, not shipped.
 */
function isIgnored(name: string): boolean {
  return (
    name.startsWith(".") ||
    name === "node_modules" ||
    name === "INTENT.md" ||
    name === "DETAIL.md"
  );
}

function toPosix(p: string): string {
  return sep === "/" ? p : p.split(sep).join("/");
}
