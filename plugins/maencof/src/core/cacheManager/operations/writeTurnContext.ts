/**
 * @file writeTurnContext.ts
 * @description Persist session-scoped turn context to the cache.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from './getCacheDir.js';

export function writeTurnContext(cwd: string, context: string): void {
  const cacheDir = getCacheDir(cwd);
  const turnFile = join(cacheDir, 'turn-context');
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(turnFile, context, 'utf-8');
  } catch {
    // silently ignore
  }
}
