import { projectRoot } from '@ogham/cross-platform';

import {
  GATE_ID_PATTERN,
  TASK_NAME_PATTERN,
} from '../../../constants/gates.js';
import {
  abandonGate,
  computeLedgerStatus,
  isTaskName,
  listTaskLedgers,
  readTaskLedger,
  recordManualEvidence,
} from '../../../core/gates/index.js';
import type { TaskLedgerStatus } from '../../../types/gates.js';

/** Ledger operation exposed by the gates MCP tool. */
export type GatesAction = 'status' | 'abandon' | 'record';

/** Inputs shared by the three ledger operations. */
export interface GatesInput {
  /** Operation to perform. */
  action: GatesAction;
  /** Optional path inside the target repository. */
  project_root?: string;
  /** Lowercase kebab-case task directory name. */
  task?: string | null;
  /** Gate identifier such as `G3`. */
  gate_id?: string | null;
  /** Required explanation for `abandon`. */
  reason?: string | null;
  /** Required observation for manual `record`. */
  evidence?: string | null;
}

/** Result of a status projection or one persisted ledger mutation. */
export type GatesOutput =
  | {
      /** Status discriminant. */
      action: 'status';
      /** Task projections in task-name order. */
      tasks: TaskLedgerStatus[];
      /** Whether every returned task has no unmet gate. */
      all_met: boolean;
    }
  | {
      /** Mutation discriminant. */
      action: 'abandon' | 'record';
      /** Mutated task name. */
      task: string;
      /** Mutated gate identifier. */
      gate_id: string;
      /** Task status after the persisted mutation. */
      status: TaskLedgerStatus;
    };

/**
 * Require a path-safe task name.
 *
 * @param value Candidate task name.
 * @returns Valid lowercase kebab-case task name.
 */
function requireTask(value: GatesInput['task']): string {
  if (!isTaskName(value))
    throw new Error(`task must match ${TASK_NAME_PATTERN}`);
  return value;
}

/**
 * Require a gate identifier accepted by the ledger grammar.
 *
 * @param value Candidate gate identifier.
 * @returns Valid gate identifier.
 */
function requireGateId(value: GatesInput['gate_id']): string {
  if (typeof value !== 'string' || !GATE_ID_PATTERN.test(value))
    throw new Error(`gate_id must match ${GATE_ID_PATTERN}`);
  return value;
}

/**
 * Read or explicitly mutate task gate ledger state.
 *
 * Status only projects existing files. Abandon and record delegate their
 * locked writes to the core ledger boundary. This function never executes a
 * command, creates a ledger, or accepts session identity.
 *
 * @param input Requested ledger action and its fields.
 * @returns Status for every selected task or the task after mutation.
 */
export function handleGates(input: GatesInput): GatesOutput {
  const root = projectRoot(input.project_root);

  if (input.action === 'status') {
    let tasks: TaskLedgerStatus[];
    if (input.task == null) {
      tasks = listTaskLedgers(root).map(({ task, path, ledger }) =>
        computeLedgerStatus(task, path, ledger),
      );
    } else {
      const task = requireTask(input.task);
      const record = readTaskLedger(root, task);
      if (record === undefined) throw new Error(`No ledger for task "${task}"`);
      tasks = [
        computeLedgerStatus(task, record.path, record.ledger, { gates: true }),
      ];
    }
    return {
      action: 'status',
      tasks,
      all_met: tasks.every((task) => task.all_met),
    };
  }

  const task = requireTask(input.task);
  const gateId = requireGateId(input.gate_id);
  const status =
    input.action === 'abandon'
      ? abandonGate(root, task, gateId, input.reason ?? '')
      : recordManualEvidence(root, task, gateId, input.evidence ?? '');
  return { action: input.action, task, gate_id: gateId, status };
}
