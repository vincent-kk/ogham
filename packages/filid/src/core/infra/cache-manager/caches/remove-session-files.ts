import { unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from './get-cache-dir.js';
import { sessionIdHash } from './session-id-hash.js';

/**
 * Remove all session-related cache files.
 *
 * Intentional cross-concern coupling: this function knows the filename
 * conventions of prompt-context, guide, boundary, and fmap caches.
 * See DETAIL.md for rationale.
 */
export function removeSessionFiles(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const marker = join(cacheDir, `session-context-${hash}`);
  const contextFile = join(cacheDir, `prompt-context-${hash}`);
  const boundaryFile = join(cacheDir, `boundary-${hash}`);
  const fmapFile = join(cacheDir, `fmap-${hash}.json`);
  const guideFile = join(cacheDir, `guide-${hash}`);
  for (const file of [marker, contextFile, boundaryFile, fmapFile, guideFile]) {
    try {
      unlinkSync(file);
    } catch {
      // silently ignore — file may not exist
    }
  }
}
