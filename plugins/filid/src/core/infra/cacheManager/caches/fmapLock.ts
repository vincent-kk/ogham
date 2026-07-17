import {
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';

import { ownerPath } from './utils/ownerPath.js';

let seq = 0;

/**
 * Bounded cross-process mutex via atomic `mkdir` (100ms budget, 1s stale
 * eviction). Returns an ownership token on success, null on timeout — a timed
 * out caller proceeds lockless (a hook must degrade, never hang).
 *
 * The token fences release: a caller whose critical section outran the 1s
 * stale window is evicted and re-acquired by a sibling, so on late release it
 * finds a different owner token and MUST NOT delete the sibling's live lock.
 */
export function acquireLock(lockPath: string): string | null {
  const token = `${process.pid}-${Date.now()}-${(seq += 1)}`;
  const deadline = Date.now() + 100;
  for (;;) {
    try {
      mkdirSync(lockPath);
      writeFileSync(ownerPath(lockPath), token);
      return token;
    } catch {
      /* held by a sibling process */
    }
    try {
      if (Date.now() - statSync(lockPath).mtimeMs > 1000)
        rmSync(lockPath, { recursive: true, force: true });
    } catch {
      /* lock vanished — retry */
    }
    if (Date.now() > deadline) return null;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
  }
}

/**
 * Release only when the on-disk owner still matches this caller's token — a
 * mismatch means the lock was stale-evicted and now belongs to a sibling, so
 * deleting it would free someone else's live critical section.
 */
export function releaseLock(lockPath: string, token: string | null): void {
  if (token === null) return;
  try {
    if (readFileSync(ownerPath(lockPath), 'utf-8') === token)
      rmSync(lockPath, { recursive: true, force: true });
  } catch {
    /* already evicted or vanished */
  }
}
