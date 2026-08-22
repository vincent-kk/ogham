import { mkdirSync, rmdirSync, statSync } from 'node:fs';

/**
 * How long a lock may stand before it is treated as abandoned. Matches the
 * hook timeout in `hooks.json`: past it, the holder is not coming back.
 */
const STALE_AFTER_MS = 5_000;

/** How long a caller waits for the lock before giving up and proceeding. */
const ACQUIRE_TIMEOUT_MS = 500;

/** Gap between acquisition attempts. */
const RETRY_INTERVAL_MS = 5;

/**
 * Take a lock directory, answering whether this caller now holds it.
 *
 * `mkdir` is the whole test-and-set: it fails when the name is already
 * taken, and hook processes are separate `node` runs, so no in-process
 * primitive could serialise them. A lock left behind by a killed holder is
 * reclaimed once it is older than {@link STALE_AFTER_MS}.
 *
 * Returns `false` rather than throwing or waiting indefinitely when the
 * lock stays held: the caller then proceeds unserialised, because a hook
 * that stalls a turn is worse than one that races for it.
 *
 * @param lockPath Directory whose creation is the lock.
 * @returns `true` when the lock was taken, and the caller owes a release.
 */
export function acquireLockDir(lockPath: string): boolean {
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  for (;;)
    try {
      mkdirSync(lockPath);
      return true;
    } catch {
      if (dropStale(lockPath)) continue;
      if (Date.now() >= deadline) return false;
      Atomics.wait(
        new Int32Array(new SharedArrayBuffer(4)),
        0,
        0,
        RETRY_INTERVAL_MS,
      );
    }
}

/**
 * Reclaim an abandoned lock directory once its holder is stale.
 *
 * @param lockPath Directory whose age and ownership are checked.
 * @returns `true` when a stale directory was removed.
 */
function dropStale(lockPath: string): boolean {
  try {
    if (Date.now() - statSync(lockPath).mtimeMs < STALE_AFTER_MS) return false;
    rmdirSync(lockPath);
    return true;
  } catch {
    return false;
  }
}
