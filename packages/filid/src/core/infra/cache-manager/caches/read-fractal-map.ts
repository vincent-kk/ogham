import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir, sessionIdHash } from './session-cache.js';

/** In-memory fractal map per session */
export interface FractalMap {
  reads: string[]; // accessed directories (order preserved, no duplicates)
  intents: string[]; // directories with INTENT.md (dedup dual-use)
  details: string[]; // directories with DETAIL.md
}

/**
 * Read fractal map from cache.
 */
export function readFractalMap(cwd: string, sessionId: string): FractalMap {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `fmap-${hash}.json`);
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return { reads: [], intents: [], details: [] };
  }
}
