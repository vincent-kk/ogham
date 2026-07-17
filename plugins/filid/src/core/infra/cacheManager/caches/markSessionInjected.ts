import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import { CACHE_PREFIX } from './constants/cacheFiles.js';
import { pruneOldSessions } from './pruneOldSessions.js';
import { getCacheDir } from './utils/getCacheDir.js';
import { sessionIdHash } from './utils/sessionIdHash.js';

const log = createLogger('cache');

export function markSessionInjected(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  const marker = join(
    cacheDir,
    `${CACHE_PREFIX.SESSION_CONTEXT}${sessionIdHash(sessionId)}`,
  );
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(marker, '', 'utf-8');
    pruneOldSessions(cwd);
  } catch (e) {
    log.debug('markSessionInjected failed:', e);
  }
}
