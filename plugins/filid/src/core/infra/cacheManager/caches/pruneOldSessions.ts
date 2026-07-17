import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import {
  MAX_SESSION_FILES_BEFORE_PRUNE,
  SESSION_TTL_MS,
} from '../../../../constants/infraDefaults.js';

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
    const sessionFiles = files.filter((f) => f.startsWith('session-context-'));
    if (sessionFiles.length <= MAX_SESSION_FILES_BEFORE_PRUNE) return;
    const now = Date.now();
    for (const file of sessionFiles) {
      const fp = join(dir, file);
      try {
        if (now - statSync(fp).mtimeMs > SESSION_TTL_MS) {
          unlinkSync(fp);
          // also remove paired cache files (aligned with removeSessionFiles);
          // fmap uses a prefix match to catch subagent-scoped map files too
          const hash = file.replace('session-context-', '');
          const paired = [
            join(dir, `prompt-context-${hash}`),
            join(dir, `guide-${hash}`),
            join(dir, `boundary-${hash}`),
            join(dir, `delivered-${hash}.json`),
            join(dir, `turn-${hash}`),
            ...files
              .filter((f) => f.startsWith(`fmap-${hash}`))
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
