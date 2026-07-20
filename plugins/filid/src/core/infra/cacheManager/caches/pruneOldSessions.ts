import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import {
  MAX_SESSION_FILES_BEFORE_PRUNE,
  SESSION_TTL_MS,
} from '../../../../constants/infraDefaults.js';

import { CACHE_PREFIX } from './constants/cacheFiles.js';
import { getCacheDir } from './utils/getCacheDir.js';

/**
 * Prune old session files.
 *
 * Intentional cross-concern coupling: this function knows the filename
 * conventions of prompt-context, guide, boundary, and fmap caches.
 * This is necessary because pruning a session must remove all paired
 * cache files atomically. Documented in DETAIL.md.
 */
export function pruneOldSessions(cwd: string): void {
  try {
    const dir = getCacheDir(cwd);
    const files = readdirSync(dir);
    const sessionFiles = files.filter((f) =>
      f.startsWith(CACHE_PREFIX.SESSION_CONTEXT),
    );
    if (sessionFiles.length <= MAX_SESSION_FILES_BEFORE_PRUNE) return;
    const now = Date.now();
    for (const file of sessionFiles) {
      const fp = join(dir, file);
      try {
        if (now - statSync(fp).mtimeMs > SESSION_TTL_MS) {
          unlinkSync(fp);
          // also remove paired cache files (aligned with removeSessionFiles);
          // fmap uses a prefix match to catch subagent-scoped map files too
          const hash = file.replace(CACHE_PREFIX.SESSION_CONTEXT, '');
          const paired = [
            join(dir, `${CACHE_PREFIX.PROMPT_CONTEXT}${hash}`),
            join(dir, `${CACHE_PREFIX.GUIDE}${hash}`),
            join(dir, `${CACHE_PREFIX.BOUNDARY}${hash}`),
            join(dir, `${CACHE_PREFIX.DELIVERED}${hash}.json`),
            join(dir, `${CACHE_PREFIX.TURN}${hash}`),
            ...files
              .filter((f) => f.startsWith(`${CACHE_PREFIX.FMAP}${hash}`))
              .map((f) => join(dir, f)),
          ];
          for (const pairedFile of paired)
            try {
              if (existsSync(pairedFile)) unlinkSync(pairedFile);
            } catch {
              // ignore
            }
        }
      } catch {
        // ignore individual file deletion failures
      }
    }
  } catch {
    // ignore directory read failures
  }
}
