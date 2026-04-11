import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir, sessionIdHash } from './session-cache.js';

/** In-memory fractal map per session */
export interface FractalMap {
  reads: string[]; // accessed directories (order preserved, no duplicates)
  intents: string[]; // directories with INTENT.md (dedup dual-use)
  details: string[]; // directories with DETAIL.md
}

/**
 * Read fractal map from cache.
 */
export function readFractalMap(cwd: string, sessionId: string): FractalMap {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `fmap-${hash}.json`);
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return { reads: [], intents: [], details: [] };
  }
}

/**
 * Write fractal map to cache.
 */
export function writeFractalMap(
  cwd: string,
  sessionId: string,
  map: FractalMap,
): void {
  const cacheDir = getCacheDir(cwd);
  mkdirSync(cacheDir, { recursive: true });
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `fmap-${hash}.json`);
  writeFileSync(filePath, JSON.stringify(map));
}

/**
 * Remove fractal map cache for a session.
 * Called by UserPromptSubmit to reset per-turn state.
 */
export function removeFractalMap(cwd: string, sessionId: string): void {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `fmap-${hash}.json`);
  try {
    unlinkSync(filePath);
  } catch {
    // silently ignore — file may not exist
  }
}
