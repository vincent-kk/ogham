import { readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from './utils/getCacheDir.js';
import { sessionIdHash } from './utils/sessionIdHash.js';

/**
 * Remove every fractal-map file of a session — the main-scope map and all
 * subagent-scoped siblings (`fmap-{hash}-sub-*.json`). Called by
 * UserPromptSubmit for the per-turn reset and by session cleanup paths.
 */
export function removeFractalMap(cwd: string, sessionId: string): void {
  const cacheDir = getCacheDir(cwd);
  const prefix = `fmap-${sessionIdHash(sessionId)}`;
  let files: string[];
  try {
    files = readdirSync(cacheDir);
  } catch {
    return;
  }
  for (const file of files)
    if (file.startsWith(prefix) && !file.endsWith('.lock'))
      try {
        unlinkSync(join(cacheDir, file));
      } catch {
        // silently ignore — file may not exist
      }
}
