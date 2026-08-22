import { portableJoin } from '@ogham/cross-platform';

import type { TaskLedgerStatus } from '../../../types/gates.js';
import { parseGatesLedger } from '../parse/parseGatesLedger.js';
import { computeLedgerStatus } from '../status/computeLedgerStatus.js';
import { readTaskLedger } from '../store/readTaskLedger.js';
import { resolveTasksDir } from '../store/resolveTasksDir.js';
import { withGatesLock } from '../store/withGatesLock.js';
import { writeLedgerLines } from '../store/writeLedgerLines.js';
import { appendAbandonLine } from '../utils/appendAbandonLine.js';
import { isTaskName } from '../utils/isTaskName.js';

/**
 * Append a reasoned abandonment under the task mutation lock.
 *
 * @param projectRoot Any path inside the owning repository.
 * @param task Valid task name.
 * @param gateId Gate identifier being abandoned.
 * @param reason Non-empty reason for the visible scope reduction.
 * @returns Task status after the persisted abandonment.
 */
export function abandonGate(
  projectRoot: string,
  task: string,
  gateId: string,
  reason: string,
): TaskLedgerStatus {
  const explanation = reason.trim();
  if (explanation === '') throw new Error('abandon requires a reason');
  if (/[\r\n]/.test(reason))
    throw new Error('abandon requires a single-line reason');
  if (!isTaskName(task)) throw new Error(`No ledger for task "${task}"`);
  const taskDir = portableJoin(resolveTasksDir(projectRoot), task);

  return withGatesLock(taskDir, () => {
    const current = readTaskLedger(projectRoot, task);
    if (current === undefined) throw new Error(`No ledger for task "${task}"`);
    if (!current.ledger.gates.some((gate) => gate.id === gateId))
      throw new Error(`No gate ${gateId} for task "${task}"`);
    if (current.ledger.abandons.some((entry) => entry.id === gateId))
      throw new Error(`Gate ${gateId} is already abandoned`);

    const lines = appendAbandonLine(current.ledger.lines, gateId, explanation);
    writeLedgerLines(current.path, lines);
    return computeLedgerStatus(
      task,
      current.path,
      parseGatesLedger(lines.join('\n')),
    );
  });
}
