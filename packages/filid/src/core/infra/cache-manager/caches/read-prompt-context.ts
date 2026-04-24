import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import { getCacheDir, sessionIdHash } from './session-cache.js';

const log = createLogger('cache');

export function readPromptContext(
  cwd: string,
  sessionId: string,
): string | null {
  const cacheDir = getCacheDir(cwd);
  const contextFile = join(
    cacheDir,
    `prompt-context-${sessionIdHash(sessionId)}`,
  );
  try {
    if (!existsSync(contextFile)) return null;
    return readFileSync(contextFile, 'utf-8');
  } catch (e) {
    log.debug('readPromptContext failed:', e);
    return null;
  }
}
