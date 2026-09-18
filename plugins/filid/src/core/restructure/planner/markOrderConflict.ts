import {
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_REASON_TEXT,
} from '../../../constants/restructure.js';
import type { MoveInstruction } from '../../../types/restructure.js';

/**
 * Turn an executable instruction into an unresolved one that no execution
 * order can satisfy.
 * @param move - An instruction the ordering step reported as a conflict
 * @returns A copy that requires a decision and carries `move-order-conflict`
 */
export function markOrderConflict(move: MoveInstruction): MoveInstruction {
  return {
    ...move,
    reason: RESTRUCTURE_REASON_TEXT.DECISION_REQUIRED,
    requiresDecision: true,
    decisionReasons: [
      ...move.decisionReasons,
      RESTRUCTURE_DECISION_REASONS.MOVE_ORDER_CONFLICT,
    ].sort(),
  };
}
