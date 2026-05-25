import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FractalMap } from './read-fractal-map.js';
import { getCacheDir, sessionIdHash } from './session-cache.js';

/**
 * Write fractal map to cache.
 */
export function writeFractalMap(
  cwd: string,
  sessionId: string,
  map: FractalMap,
): void {
  const cacheDir = getCacheDir(cwd);
  mkdirSync(cacheDir, { recursive: true });
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `fmap-${hash}.json`);
  writeFileSync(filePath, JSON.stringify(map));
}
