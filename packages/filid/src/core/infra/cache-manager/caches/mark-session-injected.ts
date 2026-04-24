import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { getCacheDir } from './get-cache-dir.js';
import { pruneOldSessions } from './prune-old-sessions.js';
import { sessionIdHash } from './session-id-hash.js';

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
