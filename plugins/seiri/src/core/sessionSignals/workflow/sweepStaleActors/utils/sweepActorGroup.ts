import { lstatSync, rmSync } from 'node:fs';

import {
  portableJoin,
  removeFileIfExistsSync,
  withFileLockSync,
} from '@ogham/cross-platform';

import { IDLE_STATE_TTL } from '../../../../../constants/retention.js';

/**
 * Delete a stale group, serializing actor members with their owner's lock.
 * @param dir Absolute sessions directory.
 * @param key Basename through the first .json, or an unrelated member name.
 * @param members Basenames captured by the directory scan.
 * @param now Epoch milliseconds for the strict idle boundary.
 * @returns Nothing; filesystem failures propagate to the per-group caller.
 */
export function sweepActorGroup(
  dir: string,
  key: string,
  members: string[],
  now: number,
): void {
  if (!members.every((name) => isStale(portableJoin(dir, `./${name}`), now)))
    return;
  if (!key.endsWith('.json')) {
    for (const name of members)
      removeSweepEntry(portableJoin(dir, `./${name}`));
    return;
  }
  const lockName = `${key}.lock`;
  withFileLockSync(
    portableJoin(dir, `./${key}`),
    () => {
      const contents = members
        .filter((name) => name !== lockName)
        .sort((a, b) => Number(b === key) - Number(a === key));
      if (
        !contents.every((name) => isStale(portableJoin(dir, `./${name}`), now))
      )
        return;
      for (const name of contents)
        removeSweepEntry(portableJoin(dir, `./${name}`));
    },
    { timeoutMs: 500, staleMs: 5_000 },
  );
}

/**
 * Check the member itself without following symlinks; absent members do not veto.
 * @param path Absolute group member path.
 * @param now Epoch milliseconds for the strict idle boundary.
 * @returns Whether the member is absent or stale; other read failures propagate.
 */
function isStale(path: string, now: number): boolean {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  return !stat || now - stat.mtimeMs > IDLE_STATE_TTL;
}

/**
 * Remove an entry without following links; a directory includes its descendants.
 * @param path Absolute stale group member to remove.
 * @returns Nothing.
 */
function removeSweepEntry(path: string): void {
  if (lstatSync(path, { throwIfNoEntry: false })?.isDirectory())
    rmSync(path, { recursive: true, force: true });
  else removeFileIfExistsSync(path);
}
