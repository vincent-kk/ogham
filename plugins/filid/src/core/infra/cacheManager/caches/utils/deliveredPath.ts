import { join } from 'node:path';

import { CACHE_PREFIX } from '../constants/cacheFiles.js';

import { getCacheDir } from './getCacheDir.js';
import { sessionIdHash } from './sessionIdHash.js';

/** Path of the session-epoch delivery record (main scope only). */
export function deliveredPath(cwd: string, sessionId: string): string {
  return join(
    getCacheDir(cwd),
    `${CACHE_PREFIX.DELIVERED}${sessionIdHash(sessionId)}.json`,
  );
}
