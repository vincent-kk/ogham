import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import { CACHE_PREFIX } from './constants/cacheFiles.js';
import { getCacheDir, sessionIdHash } from './sessionCache.js';

const log = createLogger('cache');

export function hasPromptContext(sessionId: string, cwd: string): boolean {
  const contextFile = join(
    getCacheDir(cwd),
    `${CACHE_PREFIX.PROMPT_CONTEXT}${sessionIdHash(sessionId)}`,
  );
  try {
    return existsSync(contextFile);
  } catch (e) {
    log.debug('hasPromptContext failed:', e);
    return false;
  }
}
