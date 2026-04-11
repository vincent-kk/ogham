import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir, sessionIdHash } from './session-cache.js';

/**
 * Check if [filid:filid-guide] has been injected in this session.
 */
export function hasGuideInjected(sessionId: string, cwd: string): boolean {
  const filePath = join(getCacheDir(cwd), `guide-${sessionIdHash(sessionId)}`);
  try {
    return existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Mark [filid:filid-guide] as injected for this session.
 */
export function markGuideInjected(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  writeFileSync(
    join(cacheDir, `guide-${sessionIdHash(sessionId)}`),
    '',
    'utf-8',
  );
}
