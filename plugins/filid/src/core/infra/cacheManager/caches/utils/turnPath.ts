import { join } from 'node:path';

import { CACHE_PREFIX } from '../constants/cacheFiles.js';

import { getCacheDir } from './getCacheDir.js';
import { sessionIdHash } from './sessionIdHash.js';

/** On-disk path of the session turn counter. */
export function turnPath(cwd: string, sessionId: string): string {
  return join(
    getCacheDir(cwd),
    `${CACHE_PREFIX.TURN}${sessionIdHash(sessionId)}`,
  );
}
