import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir, sessionIdHash } from './sessionCache.js';

/**
 * In-memory fractal map per session.
 *
 * Entries are `{boundaryAbsPath}\t{relDir}` composite keys — relDir alone
 * collides across monorepo packages (both `plugins/a/src` and `plugins/b/src`
 * reduce to `src`). Display consumers strip everything through the tab.
 */
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
