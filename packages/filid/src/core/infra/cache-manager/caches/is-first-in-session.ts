import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { getCacheDir } from './get-cache-dir.js';
import { sessionIdHash } from './session-id-hash.js';

const log = createLogger('cache');

export function isFirstInSession(sessionId: string, cwd: string): boolean {
  const marker = join(
    getCacheDir(cwd),
    `session-context-${sessionIdHash(sessionId)}`,
  );
  try {
    return !existsSync(marker);
  } catch (e) {
    log.debug('isFirstInSession failed:', e);
    return true;
  }
}
