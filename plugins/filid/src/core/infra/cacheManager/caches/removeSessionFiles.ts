import { unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { CACHE_PREFIX } from './constants/cacheFiles.js';
import { removeFractalMap } from './removeFractalMap.js';
import { getCacheDir } from './utils/getCacheDir.js';
import { sessionIdHash } from './utils/sessionIdHash.js';

/**
 * Remove all session-related cache files. Also the SessionStart epoch reset
 * (compact/clear): every context-dependent record (delivery, turn, guide,
 * pointer markers) is re-armed; boundary is filesystem fact and its removal
 * only costs recomputation.
 *
 * Intentional cross-concern coupling: this function knows the filename
 * conventions of the sibling caches. See DETAIL.md for rationale.
 */
export function removeSessionFiles(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const names = [
    `${CACHE_PREFIX.SESSION_CONTEXT}${hash}`,
    `${CACHE_PREFIX.PROMPT_CONTEXT}${hash}`,
    `${CACHE_PREFIX.BOUNDARY}${hash}`,
    `${CACHE_PREFIX.GUIDE}${hash}`,
    `${CACHE_PREFIX.DELIVERED}${hash}.json`,
    `${CACHE_PREFIX.TURN}${hash}`,
  ];
  for (const name of names)
    try {
      unlinkSync(join(cacheDir, name));
    } catch {
      // silently ignore — file may not exist
    }
  removeFractalMap(cwd, sessionId);
}
