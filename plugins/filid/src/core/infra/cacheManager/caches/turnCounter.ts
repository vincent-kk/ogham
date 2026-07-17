import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { getCacheDir } from './utils/getCacheDir.js';
import { turnPath } from './utils/turnPath.js';

/** Current session turn (0 before the first UserPromptSubmit). */
export function readTurn(cwd: string, sessionId: string): number {
  try {
    const n = Number(readFileSync(turnPath(cwd, sessionId), 'utf-8'));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

/**
 * Advance the turn counter by one. Called from UserPromptSubmit, which runs
 * once per prompt and never concurrently with itself — plain read-modify-write
 * is sufficient.
 */
export function incrementTurn(cwd: string, sessionId: string): number {
  const next = readTurn(cwd, sessionId) + 1;
  mkdirSync(getCacheDir(cwd), { recursive: true });
  writeFileSync(turnPath(cwd, sessionId), String(next));
  return next;
}
