import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';

/**
 * Reject a review whose actor groups exceed the user's explicit spending bound.
 * @param groups Prepared groups; candidate-only groups consume no reviewer.
 * @param maxGroups Optional positive group budget from validated configuration.
 * @returns Nothing when every reviewer group fits within the budget.
 * @throws A diagnostic error before any actor handoff can be returned.
 */
export function assertReviewGroupBudget(
  groups: readonly ReviewGroup[],
  maxGroups: number | undefined,
): void {
  const count = groups.filter(
    (group) => group.rounds > 0 && !group.reusedFrom,
  ).length;
  if (maxGroups !== undefined && count > maxGroups)
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.GROUP_BUDGET_EXCEEDED,
      `Review needs ${count} reviewer groups, exceeding review.maxGroups=${maxGroups}.`,
      REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.GROUP_BUDGET_EXCEEDED,
    );
}
