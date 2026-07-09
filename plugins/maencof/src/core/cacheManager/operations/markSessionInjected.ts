/**
 * @file markSessionInjected.ts
 * @description Write the session injection marker and prune stale sessions.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from './getCacheDir.js';
import { pruneOldSessions } from './pruneOldSessions.js';
import { sessionIdHash } from './sessionIdHash.js';

export function markSessionInjected(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  const marker = join(cacheDir, `session-context-${sessionIdHash(sessionId)}`);
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(marker, '', 'utf-8');
    pruneOldSessions(cwd);
  } catch {
    // silently ignore marker write failures
  }
}
