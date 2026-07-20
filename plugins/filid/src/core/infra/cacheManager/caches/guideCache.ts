import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CACHE_PREFIX } from './constants/cacheFiles.js';
import { getCacheDir, sessionIdHash } from './sessionCache.js';

/**
 * Check if [filid:guide] has been injected in this session.
 */
export function hasGuideInjected(sessionId: string, cwd: string): boolean {
  const filePath = join(
    getCacheDir(cwd),
    `${CACHE_PREFIX.GUIDE}${sessionIdHash(sessionId)}`,
  );
  try {
    return existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Mark [filid:guide] as injected for this session.
 */
export function markGuideInjected(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  writeFileSync(
    join(cacheDir, `${CACHE_PREFIX.GUIDE}${sessionIdHash(sessionId)}`),
    '',
    'utf-8',
  );
}
