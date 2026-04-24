import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import {
  MAX_SESSION_FILES_BEFORE_PRUNE,
  SESSION_TTL_MS,
} from '../../../../constants/infra-defaults.js';
import { getCacheDir } from './get-cache-dir.js';

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
          // also remove paired cache files (aligned with removeSessionFiles)
          const hash = file.replace('session-context-', '');
          const contextFp = join(dir, `prompt-context-${hash}`);
          const guideFp = join(dir, `guide-${hash}`);
          const boundaryFp = join(dir, `boundary-${hash}`);
          const fmapFp = join(dir, `fmap-${hash}.json`);
          for (const paired of [contextFp, guideFp, boundaryFp, fmapFp]) {
            try {
              if (existsSync(paired)) unlinkSync(paired);
            } catch {
              // ignore
            }
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
