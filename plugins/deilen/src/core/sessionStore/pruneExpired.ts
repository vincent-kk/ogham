import { readdir, rm, stat } from "node:fs/promises";

import { SESSIONS_DIR, sessionDir } from "../../constants/paths.js";
import { logger } from "../../lib/logger.js";
import { isFileNotFound } from "../../utils/isFileNotFound.js";

const HOUR_MS = 60 * 60 * 1000;

/** Remove session directories older than ttlHours. Returns the count removed. */
export async function pruneExpired(ttlHours: number): Promise<number> {
  let entries: string[];
  try {
    entries = await readdir(SESSIONS_DIR);
  } catch (err) {
    if (isFileNotFound(err)) return 0;
    throw err;
  }
  const cutoff = Date.now() - ttlHours * HOUR_MS;
  let removed = 0;
  for (const id of entries) {
    const dir = sessionDir(id);
    try {
      const info = await stat(dir);
      if (!info.isDirectory()) continue;
      if (info.mtimeMs < cutoff) {
        await rm(dir, { recursive: true, force: true });
        removed += 1;
      }
    } catch (err) {
      logger.warn("prune skip", {
        session_id: id,
        error: (err as Error).message,
      });
    }
  }
  return removed;
}
