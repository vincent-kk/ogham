import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { WORKSPACES_DIR } from "../../../constants/paths.js";
import { isFileNotFound } from "../../../utils/isFileNotFound.js";

const MS_PER_HOUR = 3_600_000;

/**
 * Remove workspace directories whose mtime is older than ttlHours. Best-effort:
 * races on individual entries are ignored. Returns the count removed.
 */
export async function pruneExpired(ttlHours: number): Promise<number> {
  const cutoff = Date.now() - ttlHours * MS_PER_HOUR;
  let entries: string[];
  try {
    entries = await readdir(WORKSPACES_DIR);
  } catch (error) {
    if (isFileNotFound(error)) return 0;
    throw error;
  }

  let removed = 0;
  for (const name of entries) {
    const dir = join(WORKSPACES_DIR, name);
    try {
      if ((await stat(dir)).mtimeMs < cutoff) {
        await rm(dir, { recursive: true, force: true });
        removed += 1;
      }
    } catch {
      // ignore races on individual workspace dirs
    }
  }
  return removed;
}
