import { lstatSync } from 'node:fs';

import {
  listDirectoryIfExistsSync,
  portableJoin,
  readUtf8FileIfExistsSync,
} from '@ogham/cross-platform';

import { GATES_FILE } from '../../../constants/files.js';
import type { TaskLedger } from '../../../types/gates.js';
import { parseGatesLedger } from '../parse/parseGatesLedger.js';
import { isTaskName } from '../utils/isTaskName.js';

import { resolveTasksDir } from './resolveTasksDir.js';

/**
 * List every readable task ledger without throwing for missing local state.
 *
 * @param projectRoot Any path inside the owning repository.
 * @returns Valid task ledgers sorted by task name.
 */
export function listTaskLedgers(projectRoot: string): TaskLedger[] {
  const tasksDir = resolveTasksDir(projectRoot);
  let entries;
  try {
    entries = listDirectoryIfExistsSync(tasksDir);
  } catch {
    return [];
  }

  const ledgers: TaskLedger[] = [];
  for (const entry of entries) {
    if (!isTaskName(entry)) continue;
    const dir = portableJoin(tasksDir, entry);
    const path = portableJoin(dir, GATES_FILE);
    try {
      if (!lstatSync(dir, { throwIfNoEntry: false })?.isDirectory()) continue;
      const text = readUtf8FileIfExistsSync(path);
      if (text === null) continue;
      ledgers.push({
        task: entry,
        dir,
        path,
        ledger: parseGatesLedger(text),
      });
    } catch {
      // An unreadable task is absent from this fail-open observation.
    }
  }
  return ledgers.sort((left, right) => left.task.localeCompare(right.task));
}
