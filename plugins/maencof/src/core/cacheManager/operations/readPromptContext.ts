/**
 * @file readPromptContext.ts
 * @description Read per-session prompt context text from the cache.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from './getCacheDir.js';
import { sessionIdHash } from './sessionIdHash.js';

export function readPromptContext(
  cwd: string,
  sessionId: string,
): string | null {
  const contextFile = join(
    getCacheDir(cwd),
    `prompt-context-${sessionIdHash(sessionId)}`,
  );
  try {
    if (!existsSync(contextFile)) return null;
    return readFileSync(contextFile, 'utf-8');
  } catch {
    return null;
  }
}
