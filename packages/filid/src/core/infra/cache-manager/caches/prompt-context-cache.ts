import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
