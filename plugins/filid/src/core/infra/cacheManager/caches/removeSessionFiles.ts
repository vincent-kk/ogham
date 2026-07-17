import { unlinkSync } from 'node:fs';
import { join } from 'node:path';

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
    `session-context-${hash}`,
    `prompt-context-${hash}`,
    `boundary-${hash}`,
    `guide-${hash}`,
    `delivered-${hash}.json`,
    `turn-${hash}`,
  ];
  for (const name of names)
    try {
      unlinkSync(join(cacheDir, name));
    } catch {
      // silently ignore — file may not exist
    }
  removeFractalMap(cwd, sessionId);
}
