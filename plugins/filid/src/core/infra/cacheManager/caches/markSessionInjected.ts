import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import { getCacheDir } from './getCacheDir.js';
import { pruneOldSessions } from './pruneOldSessions.js';
import { sessionIdHash } from './sessionIdHash.js';

const log = createLogger('cache');

export function markSessionInjected(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  const marker = join(cacheDir, `session-context-${sessionIdHash(sessionId)}`);
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(marker, '', 'utf-8');
    pruneOldSessions(cwd);
  } catch (e) {
    log.debug('markSessionInjected failed:', e);
  }
}
