import * as path from 'node:path';

import {
  readBoundary,
  readFractalMap,
} from '../../../../../core/infra/cacheManager/cacheManager.js';
import type { VisitScope } from '../../../../../core/infra/cacheManager/cacheManager.js';

import { visitKey } from './visitKey.js';

export interface FastPathResult {
  /** Cached boundary for fileDir, or null on first visit this session. */
  cachedBoundary: string | null;
  /** True when the dir is already in this turn's reads — fully silent, mutations included. */
  settled: boolean;
}

/**
 * Fast path: a directory already in this turn's reads was settled by an
 * earlier commitVisit — delivery is fresh within the same turn, the map is
 * current.
 */
export function isFastPathSettled(
  cwd: string,
  sessionId: string,
  fileDir: string,
  scope: VisitScope,
): FastPathResult {
  const cachedBoundary = readBoundary(cwd, sessionId, fileDir);
  if (cachedBoundary === null) return { cachedBoundary, settled: false };
  const relDir =
    path.relative(cachedBoundary, fileDir).replace(/\\/g, '/') || '.';
  const settled = readFractalMap(cwd, scope).reads.includes(
    visitKey(cachedBoundary, relDir),
  );
  return { cachedBoundary, settled };
}
