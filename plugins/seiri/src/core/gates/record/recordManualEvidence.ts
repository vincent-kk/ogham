import { portableJoin } from '@ogham/cross-platform';

import type { TaskLedgerStatus } from '../../../types/gates.js';
import { parseGatesLedger } from '../parse/parseGatesLedger.js';
import { computeLedgerStatus } from '../status/computeLedgerStatus.js';
import { readTaskLedger } from '../store/readTaskLedger.js';
import { resolveTasksDir } from '../store/resolveTasksDir.js';
import { withGatesLock } from '../store/withGatesLock.js';
import { writeLedgerLines } from '../store/writeLedgerLines.js';
import { applyGateLines } from '../utils/applyGateLines.js';
import { excerptEvidence } from '../utils/excerptEvidence.js';
import { isTaskName } from '../utils/isTaskName.js';

/**
 * Record human evidence for a manual gate under the task mutation lock.
 *
 * @param projectRoot Any path inside the owning repository.
 * @param task Valid task name.
 * @param gateId Manual gate identifier.
 * @param evidence Non-empty human evidence.
 * @returns Task status after the persisted proof.
 */
export function recordManualEvidence(
  projectRoot: string,
  task: string,
  gateId: string,
  evidence: string,
): TaskLedgerStatus {
  const trimmedEvidence = evidence.trim();
  if (trimmedEvidence === '') throw new Error('record requires evidence');
  if (/[\r\n]/.test(evidence))
    throw new Error('record requires single-line evidence');
  const proof = excerptEvidence(trimmedEvidence, undefined);
  if (!isTaskName(task)) throw new Error(`No ledger for task "${task}"`);
  const taskDir = portableJoin(resolveTasksDir(projectRoot), task);

  return withGatesLock(taskDir, () => {
    const current = readTaskLedger(projectRoot, task);
    if (current === undefined) throw new Error(`No ledger for task "${task}"`);
    const gate = current.ledger.gates.find((entry) => entry.id === gateId);
    if (gate === undefined)
      throw new Error(`No gate ${gateId} for task "${task}"`);
    if (gate.check !== undefined)
      throw new Error(
        `Gate ${gateId} has a CHECK — it is proven by running the CHECK, not by record`,
      );

    const lines = applyGateLines(current.ledger.lines, gate, {
      checked: true,
      evidence: proof,
    });
    writeLedgerLines(current.path, lines);
    return computeLedgerStatus(
      task,
      current.path,
      parseGatesLedger(lines.join('\n')),
    );
  });
}
