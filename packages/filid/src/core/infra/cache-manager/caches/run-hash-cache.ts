import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import { getCacheDir } from './session-cache.js';

const log = createLogger('cache');

export function saveRunHash(
  cwd: string,
  skillName: string,
  hash: string,
): void {
  const cacheDir = getCacheDir(cwd);
  const hashFile = join(cacheDir, `run-${skillName}.hash`);
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(hashFile, hash, 'utf-8');
  } catch (e) {
    log.debug('saveRunHash failed:', e);
  }
}

export function getLastRunHash(cwd: string, skillName: string): string | null {
  const cacheDir = getCacheDir(cwd);
  const hashFile = join(cacheDir, `run-${skillName}.hash`);
  try {
    return readFileSync(hashFile, 'utf-8').trim();
  } catch (e) {
    log.debug('getLastRunHash failed:', e);
    return null;
  }
}
