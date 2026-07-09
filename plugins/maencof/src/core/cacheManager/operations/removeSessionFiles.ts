/**
 * @file removeSessionFiles.ts
 * @description Remove session-scoped cache files for a given session.
 */
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from './getCacheDir.js';
import { sessionIdHash } from './sessionIdHash.js';

export function removeSessionFiles(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const sessionScopedFiles = [
    join(cacheDir, `session-context-${hash}`),
    join(cacheDir, `prompt-context-${hash}`),
  ];
  for (const file of sessionScopedFiles)
    try {
      if (existsSync(file)) unlinkSync(file);
    } catch {
      // silently ignore
    }

  // NOTE: turn-context is session-scoped — removed via removeTurnContext on session end.
  // pinned-nodes.json is vault-scoped, NOT removed here.
}
