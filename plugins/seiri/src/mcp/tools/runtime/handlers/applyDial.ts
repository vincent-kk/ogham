import { projectRoot } from '@ogham/cross-platform';

import { INTERVENTION_LEVELS } from '../../../../constants/intervention.js';
import {
  clearRuntime,
  describeDial,
  isInterventionLevel,
  loadIntervention,
  renderElectionLine,
  renderPostureLines,
  writeRuntime,
} from '../../../../core/infra/configLoader/index.js';
import type { InterventionState } from '../../../../types/config.js';

/** What a `dial` call does: read the dial, turn the valve, or drop it. */
export type DialOp = 'get' | 'set' | 'clear';

/** Outcome of one dial call. */
export interface DialResult {
  /** Result discriminant. */
  action: 'dial';
  /** Operation performed. */
  op: DialOp;
  /** Whether this call altered stored state. */
  changed: boolean;
  /** Dial state after the call. */
  dial: InterventionState;
  /**
   * The posture now in effect, as one sentence.
   *
   * This is the point of the field: the tool result is itself the context
   * the session reads, so a dial the user just moved takes effect in the
   * same turn instead of waiting for the next SessionStart render.
   */
  posture: string;
}

/**
 * Read or move the session valve.
 *
 * Only the valve. The committed baseline stays a setup-surface act, so
 * that lowering intervention mid-session can never quietly rewrite what
 * the repository declares to everyone else.
 * @param rawProjectRoot Workspace root as supplied on the tool call, resolved the same way every project-scoped tool resolves it.
 * @param op Which operation to perform on the valve.
 * @param intervention Dial position for `op: "set"`.
 * @returns The dial state after the operation and the posture sentence now in effect.
 * @throws When `op` is `"set"` and `intervention` is not a valid intervention level.
 */
export function applyDial(
  rawProjectRoot: string | undefined,
  op: DialOp,
  intervention: unknown,
): DialResult {
  const root = projectRoot(rawProjectRoot);
  let changed = false;

  if (op === 'set') {
    if (!isInterventionLevel(intervention))
      throw new Error(
        `dial_op "set" needs "intervention" to be one of ${INTERVENTION_LEVELS.join(
          ' | ',
        )}; received ${JSON.stringify(intervention)}`,
      );
    writeRuntime(root, intervention);
    changed = true;
  }

  if (op === 'clear') changed = clearRuntime(root);

  const dial = loadIntervention(root);
  // Same order as SessionStart: the chain first, then its election line.
  // Off and advisory omit both; describeDial remains because this explicit
  // tool call must report the state it just applied.
  const election = renderElectionLine(dial.effective);
  return {
    action: 'dial',
    op,
    changed,
    dial,
    posture: [
      describeDial(dial),
      ...renderPostureLines(dial.effective),
      ...(election === undefined ? [] : [election]),
    ].join(' '),
  };
}
