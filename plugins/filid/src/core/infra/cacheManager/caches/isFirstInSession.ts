import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import { CACHE_PREFIX } from './constants/cacheFiles.js';
import { getCacheDir } from './utils/getCacheDir.js';
import { sessionIdHash } from './utils/sessionIdHash.js';

const log = createLogger('cache');

export function isFirstInSession(sessionId: string, cwd: string): boolean {
  const marker = join(
    getCacheDir(cwd),
    `${CACHE_PREFIX.SESSION_CONTEXT}${sessionIdHash(sessionId)}`,
  );
  try {
    return !existsSync(marker);
  } catch (e) {
    log.debug('isFirstInSession failed:', e);
    return true;
  }
}
