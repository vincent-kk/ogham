import { readFile, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { WORKSPACES_DIR, workspaceMetaPath } from "../../../constants/paths.js";
import { isFileNotFound } from "../../../utils/isFileNotFound.js";

const MS_PER_HOUR = 3_600_000;

/**
 * Age of a workspace in ms from its recorded `createdAt` (meta.json) so a reused
 * workspace_files workspace ages from first creation rather than its refreshed
 * mtime. Falls back to directory mtime when meta is absent or invalid.
 */
async function workspaceAgeMs(name: string, dir: string): Promise<number> {
  try {
    const meta = JSON.parse(
      await readFile(workspaceMetaPath(name), "utf8"),
    ) as { createdAt?: string };
    const created = meta.createdAt ? Date.parse(meta.createdAt) : NaN;
    if (!Number.isNaN(created)) return Date.now() - created;
  } catch {
    // no/invalid meta — fall back to mtime
  }
  return Date.now() - (await stat(dir)).mtimeMs;
}

/**
 * Remove workspace directories older than ttlHours (by recorded createdAt, with
 * mtime fallback). Best-effort: races on individual entries are ignored.
 * Returns the count removed.
 */
export async function pruneExpired(ttlHours: number): Promise<number> {
  const maxAgeMs = ttlHours * MS_PER_HOUR;
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
      if ((await workspaceAgeMs(name, dir)) > maxAgeMs) {
        await rm(dir, { recursive: true, force: true });
        removed += 1;
      }
    } catch {
      // ignore races on individual workspace dirs
    }
  }
  return removed;
}
