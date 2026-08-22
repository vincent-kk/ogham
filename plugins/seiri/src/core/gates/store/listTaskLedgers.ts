import { readFileSync, readdirSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

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
    entries = readdirSync(tasksDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const ledgers: TaskLedger[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !isTaskName(entry.name)) continue;
    const dir = portableJoin(tasksDir, entry.name);
    const path = portableJoin(dir, GATES_FILE);
    try {
      const text = readFileSync(path, 'utf8');
      ledgers.push({
        task: entry.name,
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
