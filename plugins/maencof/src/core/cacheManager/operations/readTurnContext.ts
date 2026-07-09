/**
 * @file readTurnContext.ts
 * @description Read session-scoped turn context from the cache.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from './getCacheDir.js';

export function readTurnContext(cwd: string): string | null {
  const turnFile = join(getCacheDir(cwd), 'turn-context');
  try {
    if (!existsSync(turnFile)) return null;
    return readFileSync(turnFile, 'utf-8');
  } catch {
    return null;
  }
}
