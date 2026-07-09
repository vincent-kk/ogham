/**
 * @file pruneOldSessions.ts
 * @description Evict expired session markers and their paired prompt-context files.
 */
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { CACHE_TTL_MS } from '../../../constants/performance.js';

import { getCacheDir } from './getCacheDir.js';

export function pruneOldSessions(cwd: string): void {
  try {
    const dir = getCacheDir(cwd);
    const files = readdirSync(dir);
    const sessionFiles = files.filter((f) => f.startsWith('session-context-'));
    if (sessionFiles.length <= 10) return;
    const now = Date.now();
    for (const file of sessionFiles) {
      const fp = join(dir, file);
      try {
        if (now - statSync(fp).mtimeMs > CACHE_TTL_MS) {
          unlinkSync(fp);
          // also remove paired prompt-context file
          const hash = file.replace('session-context-', '');
          const contextFp = join(dir, `prompt-context-${hash}`);
          try {
            if (existsSync(contextFp)) unlinkSync(contextFp);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore individual file deletion failures
      }
    }
  } catch {
    // ignore directory read failures
  }
}
