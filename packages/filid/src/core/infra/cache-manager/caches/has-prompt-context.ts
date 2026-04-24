import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import { getCacheDir, sessionIdHash } from './session-cache.js';

const log = createLogger('cache');

export function hasPromptContext(sessionId: string, cwd: string): boolean {
  const contextFile = join(
    getCacheDir(cwd),
    `prompt-context-${sessionIdHash(sessionId)}`,
  );
  try {
    return existsSync(contextFile);
  } catch (e) {
    log.debug('hasPromptContext failed:', e);
    return false;
  }
}
