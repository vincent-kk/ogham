import { existsSync } from 'node:fs';

import {
  portableBasename,
  portableJoin,
  withFileLockSync,
} from '@ogham/cross-platform';

/**
 * Run one task-ledger mutation under its gates.lock directory.
 * @param taskDir Absolute directory that owns the task ledger.
 * @param mutate Complete read-modify-write callback.
 * @returns The callback result, unchanged.
 * @throws If the task directory is absent or its lock remains held.
 */
export function withGatesLock<T>(taskDir: string, mutate: () => T): T {
  if (!existsSync(taskDir))
    throw new Error(`No ledger for task "${portableBasename(taskDir)}"`);
  const result = withFileLockSync(portableJoin(taskDir, 'gates'), mutate, {
    timeoutMs: 500,
    staleMs: 5_000,
  });
  if (!result.acquired) throw new Error('Task ledger lock unavailable');
  return result.value;
}
