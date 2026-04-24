import { unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir, sessionIdHash } from './session-cache.js';

/**
 * Remove fractal map cache for a session.
 * Called by UserPromptSubmit to reset per-turn state.
 */
export function removeFractalMap(cwd: string, sessionId: string): void {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `fmap-${hash}.json`);
  try {
    unlinkSync(filePath);
  } catch {
    // silently ignore — file may not exist
  }
}
