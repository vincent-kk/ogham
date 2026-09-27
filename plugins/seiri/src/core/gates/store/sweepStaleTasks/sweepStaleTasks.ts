import { lstatSync, readdirSync, rmSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

import { GATES_LOCK_DIR } from '../../../../constants/files.js';
import { IDLE_STATE_TTL } from '../../../../constants/retention.js';
import { resolveTasksDir } from '../resolveTasksDir.js';
import { withGatesLock } from '../withGatesLock.js';

import { newestMtime } from './utils/newestMtime.js';

/**
 * Retire stale tasks under their owning gate locks.
 * @param projectRoot Absolute path inside the owning repository.
 * @param now Epoch milliseconds used for every idle comparison.
 * @returns Nothing; failed entries remain for another server startup.
 */
export function sweepStaleTasks(projectRoot: string, now: number): void {
  try {
    const tasksDir = resolveTasksDir(projectRoot);
    if (!lstatSync(tasksDir).isDirectory()) return;
    for (const entry of readdirSync(tasksDir, { withFileTypes: true }))
      try {
        const path = portableJoin(tasksDir, entry.name);
        if (entry.isDirectory()) {
          if (now - newestMtime(path) <= IDLE_STATE_TTL) continue;
          withGatesLock(
            path,
            () => {
              const newest = newestMtime(
                path,
                [portableJoin(path, GATES_LOCK_DIR)],
                false,
              );
              if (now - newest > IDLE_STATE_TTL)
                rmSync(path, { recursive: true, force: true });
            },
            true,
          );
        } else {
          const stat = lstatSync(path, { throwIfNoEntry: false });
          if (stat && now - stat.mtimeMs > IDLE_STATE_TTL)
            rmSync(path, { force: true });
        }
      } catch {
        // A failed entry must not prevent cleanup of the remaining tasks.
      }
  } catch {
    // Optional cleanup cannot prevent the MCP server from starting.
  }
}
