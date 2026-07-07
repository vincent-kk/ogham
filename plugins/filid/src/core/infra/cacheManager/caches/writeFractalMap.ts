import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import type { FractalMap } from './readFractalMap.js';
import { getCacheDir, sessionIdHash } from './sessionCache.js';

/**
 * Bounded cross-process mutex via atomic `mkdir` (100ms budget, 1s stale
 * eviction). On timeout the write proceeds lockless — a hook must degrade,
 * never hang.
 */
function acquireLock(lockPath: string): boolean {
  const deadline = Date.now() + 100;
  for (;;) {
    try {
      mkdirSync(lockPath);
      return true;
    } catch {
      /* held by a sibling process */
    }
    try {
      if (Date.now() - statSync(lockPath).mtimeMs > 1000) rmdirSync(lockPath);
    } catch {
      /* lock vanished — retry */
    }
    if (Date.now() > deadline) return false;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
  }
}

const union = (a: string[], b: string[]): string[] => [
  ...new Set([...a, ...b]),
];

/**
 * Write fractal map to cache.
 *
 * Hook events run as concurrent short-lived processes; a plain
 * read-modify-write here loses sibling updates (parallel Read batches).
 * The write therefore re-reads the on-disk map and union-merges per key
 * inside the lock, then swaps in atomically via tmp + rename.
 */
export function writeFractalMap(
  cwd: string,
  sessionId: string,
  map: FractalMap,
): void {
  const cacheDir = getCacheDir(cwd);
  mkdirSync(cacheDir, { recursive: true });
  const filePath = join(cacheDir, `fmap-${sessionIdHash(sessionId)}.json`);
  const lockPath = `${filePath}.lock`;

  const locked = acquireLock(lockPath);
  try {
    let onDisk: Partial<FractalMap> = {};
    try {
      onDisk = JSON.parse(readFileSync(filePath, 'utf-8')) as FractalMap;
    } catch {
      /* first write of the turn — nothing to merge */
    }
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    writeFileSync(
      tmpPath,
      JSON.stringify({
        reads: union(onDisk.reads ?? [], map.reads),
        intents: union(onDisk.intents ?? [], map.intents),
        details: union(onDisk.details ?? [], map.details),
      }),
    );
    renameSync(tmpPath, filePath);
  } finally {
    if (locked)
      try {
        rmdirSync(lockPath);
      } catch {
        /* already evicted */
      }
  }
}
