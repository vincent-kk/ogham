import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import {
  SESSIONS_DIR,
  antigravityCwdPath,
  sessionDir,
} from '../../../constants/paths.js';
import { logger } from '../../../lib/logger.js';
import { SessionMetaSchema } from '../../../types/index.js';
import { isFileNotFound } from '../../../utils/isFileNotFound.js';

export async function pruneExpired(ttlHours: number): Promise<number> {
  let projectHashes: string[];
  try {
    projectHashes = await readdir(SESSIONS_DIR);
  } catch (err) {
    if (isFileNotFound(err)) return 0;
    throw err;
  }

  const cutoff = Date.now() - ttlHours * 60 * 60 * 1000;
  let removed = 0;

  for (const hash of projectHashes) {
    const dir = sessionDir(hash);
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.endsWith('.json') || entry === '_meta.json') continue;
      const file = join(dir, entry);
      let raw: unknown;
      try {
        raw = JSON.parse(await readFile(file, 'utf8'));
      } catch {
        continue;
      }
      const parsed = SessionMetaSchema.safeParse(raw);
      if (!parsed.success) continue;
      const lastUsed = Date.parse(parsed.data.last_used_at);
      if (Number.isNaN(lastUsed) || lastUsed >= cutoff) continue;

      await rm(file, { force: true });
      if (parsed.data.provider === 'antigravity') {
        await rm(antigravityCwdPath(parsed.data.session_id), {
          recursive: true,
          force: true,
        });
      }
      removed += 1;
    }

    try {
      const after = await readdir(dir);
      if (after.filter((e) => e !== '_meta.json').length === 0) {
        await rm(dir, { recursive: true, force: true });
      }
    } catch (err) {
      logger.warn('failed to inspect project dir after prune', {
        dir,
        error: (err as Error).message,
      });
    }
  }

  return removed;
}
