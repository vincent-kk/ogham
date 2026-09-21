import { RESTRUCTURE_REASON_TEXT } from '../../../constants/restructure.js';
import type {
  MoveInstruction,
  OrderConflictCause,
} from '../../../types/restructure.js';

import { describeOrderConflict } from './describeOrderConflict.js';

/**
 * Turn an executable instruction into an unresolved one that no execution
 * order can satisfy.
 * @param move - An instruction the ordering step reported as a conflict
 * @param cause - Why the ordering step could not place it
 * @param relatedSources - Sources of the other moves involved, in request order
 * @returns A copy that requires a decision and carries `move-order-conflict`,
 * with `decisions` kept in the order of `decisionReasons`
 */
export function markOrderConflict(
  move: MoveInstruction,
  cause: OrderConflictCause,
  relatedSources: string[],
): MoveInstruction {
  const decisions = [
    ...move.decisions,
    describeOrderConflict(move, cause, relatedSources),
  ].sort((left, right) =>
    left.reason < right.reason ? -1 : left.reason > right.reason ? 1 : 0,
  );
  return {
    ...move,
    reason: RESTRUCTURE_REASON_TEXT.DECISION_REQUIRED,
    requiresDecision: true,
    decisionReasons: decisions.map(({ reason }) => reason),
    decisions,
  };
}
