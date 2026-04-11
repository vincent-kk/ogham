import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import { getCacheDir, sessionIdHash } from './session-cache.js';

const log = createLogger('cache');

/**
 * Read boundary cache for a directory.
 * Returns the cached boundary path or null if not cached.
 */
export function readBoundary(
  cwd: string,
  sessionId: string,
  dir: string,
): string | null {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `boundary-${hash}`);
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    return data[dir] ?? null;
  } catch (e) {
    log.debug('readBoundary failed:', e);
    return null;
  }
}

/**
 * Write boundary cache for a directory.
 *
 * Note: read-modify-write is NOT atomic. This is acceptable because
 * Claude Code hooks execute sequentially per session — concurrent
 * writes to the same cache file do not occur in practice.
 */
export function writeBoundary(
  cwd: string,
  sessionId: string,
  dir: string,
  boundaryPath: string,
): void {
  const cacheDir = getCacheDir(cwd);
  mkdirSync(cacheDir, { recursive: true });
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `boundary-${hash}`);
  let data: Record<string, string> = {};
  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    /* new file */
  }
  data[dir] = boundaryPath;
  writeFileSync(filePath, JSON.stringify(data));
}
