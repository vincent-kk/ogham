import { mkdirSync, rmdirSync, statSync } from 'node:fs';

/**
 * Bounded cross-process mutex via atomic `mkdir` (100ms budget, 1s stale
 * eviction). On timeout the caller proceeds lockless — a hook must degrade,
 * never hang.
 */
export function acquireLock(lockPath: string): boolean {
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

export function releaseLock(lockPath: string, locked: boolean): void {
  if (locked)
    try {
      rmdirSync(lockPath);
    } catch {
      /* already evicted */
    }
}
