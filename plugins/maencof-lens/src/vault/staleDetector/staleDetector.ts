import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { findIndexMarker } from "./findMarker.js";

export interface StaleInfo {
  isStale: boolean;
  indexMtime: number | null;
  newestFileMtime: number;
  staleSince?: string;
  markerKind: "graph-meta" | "legacy" | null;
}

const SKIP_DIRS = new Set([
  ".maencof",
  ".maencof-meta",
  ".maencof-lens",
  ".git",
  "node_modules",
]);

function maxMarkdownMtime(root: string): number {
  let max = 0;
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const m = statSync(fullPath).mtimeMs;
          if (m > max) max = m;
        } catch {
          // skip unreadable files
        }
      }
    }
  }
  return max;
}

function formatSince(diffMs: number): string {
  const diffMin = Math.round(diffMs / 60_000);
  return diffMin < 60 ? `${diffMin}m ago` : `${Math.round(diffMin / 60)}h ago`;
}

/**
 * Compare the v2 commit marker (graph-meta.json) or legacy v1 index against
 * the vault markdown files' max mtime. Marker discovery is delegated to
 * findIndexMarker so this module stays focused on stale arithmetic.
 *
 * - marker absent -> stale + staleSince='index not found' + markerKind=null
 * - graph-meta marker -> standard mtime comparison + markerKind='graph-meta'
 * - legacy marker    -> always stale + staleSince='legacy v1' + markerKind='legacy'
 *                       (accuracy: never report v1 schema as fresh)
 */
export async function detectStale(vaultPath: string): Promise<StaleInfo> {
  const marker = findIndexMarker(vaultPath);

  if (marker === null) {
    return {
      isStale: true,
      indexMtime: null,
      newestFileMtime: 0,
      staleSince: "index not found",
      markerKind: null,
    };
  }

  if (marker.kind === "legacy") {
    return {
      isStale: true,
      indexMtime: marker.mtimeMs,
      newestFileMtime: 0,
      staleSince: "legacy v1",
      markerKind: "legacy",
    };
  }

  try {
    const newestFileMtime = maxMarkdownMtime(vaultPath);
    const isStale = newestFileMtime > marker.mtimeMs;
    const result: StaleInfo = {
      isStale,
      indexMtime: marker.mtimeMs,
      newestFileMtime,
      markerKind: "graph-meta",
    };

    if (isStale) {
      result.staleSince = formatSince(newestFileMtime - marker.mtimeMs);
    }

    return result;
  } catch {
    // inner walk swallows IO errors; this is the resource-exhaustion guard
    return {
      isStale: true,
      indexMtime: marker.mtimeMs,
      newestFileMtime: 0,
      staleSince: "index scan failed",
      markerKind: "graph-meta",
    };
  }
}
