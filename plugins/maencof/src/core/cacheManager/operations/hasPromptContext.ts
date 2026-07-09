/**
 * @file hasPromptContext.ts
 * @description Report whether per-session prompt context is cached.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from './getCacheDir.js';
import { sessionIdHash } from './sessionIdHash.js';

export function hasPromptContext(sessionId: string, cwd: string): boolean {
  const contextFile = join(
    getCacheDir(cwd),
    `prompt-context-${sessionIdHash(sessionId)}`,
  );
  try {
    return existsSync(contextFile);
  } catch {
    return false;
  }
}
