/**
 * @file removeTurnContext.ts
 * @description Remove the turn-context cache file for the given vault/cwd.
 */
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from './getCacheDir.js';

/**
 * Remove the turn-context cache file for the given vault/cwd.
 *
 * turn-context는 session-scope이므로 session 종료 시 폐기한다. 디렉터리 자체는 유지.
 */
export function removeTurnContext(cwd: string): void {
  const turnFile = join(getCacheDir(cwd), 'turn-context');
  try {
    if (existsSync(turnFile)) unlinkSync(turnFile);
  } catch {
    // silently ignore
  }
}
