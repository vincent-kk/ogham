import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import { getCacheDir, sessionIdHash } from './session-cache.js';

const log = createLogger('cache');

export function writePromptContext(
  cwd: string,
  context: string,
  sessionId: string,
): void {
  const cacheDir = getCacheDir(cwd);
  const contextFile = join(
    cacheDir,
    `prompt-context-${sessionIdHash(sessionId)}`,
  );
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(contextFile, context, 'utf-8');
  } catch (e) {
    log.debug('writePromptContext failed:', e);
  }
}
