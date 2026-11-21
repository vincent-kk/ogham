import { portableJoin, readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import { GATES_FILE } from '../../../constants/files.js';
import type { TaskLedger } from '../../../types/gates.js';
import { parseGatesLedger } from '../parse/parseGatesLedger.js';
import { isTaskName } from '../utils/isTaskName.js';

import { resolveTasksDir } from './resolveTasksDir.js';

/**
 * Read one named task ledger without allowing path traversal or read errors out.
 *
 * @param projectRoot Any path inside the owning repository.
 * @param task Lowercase kebab-case task name.
 * @returns Parsed task ledger, or `undefined` when invalid or unreadable.
 */
export function readTaskLedger(
  projectRoot: string,
  task: string,
): TaskLedger | undefined {
  if (!isTaskName(task)) return undefined;
  const dir = portableJoin(resolveTasksDir(projectRoot), task);
  const path = portableJoin(dir, GATES_FILE);
  try {
    const text = readUtf8FileIfExistsSync(path);
    if (text === null) return undefined;
    return {
      task,
      dir,
      path,
      ledger: parseGatesLedger(text),
    };
  } catch {
    return undefined;
  }
}
