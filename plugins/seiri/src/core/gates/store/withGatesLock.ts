import { existsSync, rmdirSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

import { GATES_LOCK_DIR } from '../../../constants/files.js';
import { acquireLockDir } from '../../utils/acquireLockDir.js';

/**
 * Run one task-ledger mutation under its fail-open lock directory.
 *
 * @param taskDir Absolute directory that owns `gates.md` and the lock.
 * @param mutate Complete read-modify-write callback.
 * @returns The callback result, unchanged.
 */
export function withGatesLock<T>(taskDir: string, mutate: () => T): T {
  if (!existsSync(taskDir)) return mutate();

  const lockPath = portableJoin(taskDir, GATES_LOCK_DIR);
  const held = acquireLockDir(lockPath);
  try {
    return mutate();
  } finally {
    if (held)
      try {
        rmdirSync(lockPath);
      } catch {
        // A stale-lock reclaimer may already have removed this directory.
      }
  }
}
