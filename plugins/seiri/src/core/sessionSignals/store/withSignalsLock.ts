import { existsSync, rmdirSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

import { CONFIG_DIR, SIGNALS_LOCK_DIR } from '../../../constants/files.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';
import { acquireSignalsLock } from '../utils/acquireSignalsLock.js';

/**
 * Run `mutate` with exclusive access to the signals file and return its
 * result.
 *
 * Every hook is its own `node` process, so one message that calls two
 * tools puts two read-modify-write cycles on a single file. Unserialised,
 * the later writer holds a snapshot taken before the earlier write landed
 * and silently drops whatever field it never read.
 *
 * Fails open twice over, because a hook may neither stall nor break a
 * turn: a lock that stays held is skipped and `mutate` runs regardless,
 * and a project with no `.seiri/` yet holds no state worth protecting —
 * the directory is not created here just to lock it, which keeps
 * `recordBashSuccess`'s promise that a project which never fails acquires
 * no state file at all.
 *
 * @param projectRoot Any path inside the project; the lock is anchored at
 *   the repository root, like the signals file it guards.
 * @param mutate The read-modify-write to serialise. Its result is returned
 *   unchanged, and a throw still releases the lock on the way out.
 */
export function withSignalsLock<T>(projectRoot: string, mutate: () => T): T {
  const dir = portableJoin(findRepoRoot(projectRoot), CONFIG_DIR);
  if (!existsSync(dir)) return mutate();

  const lockPath = portableJoin(dir, SIGNALS_LOCK_DIR);
  const held = acquireSignalsLock(lockPath);
  try {
    return mutate();
  } finally {
    if (held)
      try {
        rmdirSync(lockPath);
      } catch {
        // Already reclaimed as stale by another holder; nothing to undo.
      }
  }
}
