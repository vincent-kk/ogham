import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
  REVIEW_VALIDATION_POLICY_VERSION,
} from '../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';

import type { ReviewStateRecord } from './reviewStateTypes.js';

/**
 * Reject reuse of evidence validated under an unsupported policy.
 * @param state Parsed persisted state whose artifacts must remain untouched.
 * @throws A stable policy diagnostic requiring an explicit fresh review.
 */
export function assertReviewValidationPolicy(state: ReviewStateRecord): void {
  if (state.validationPolicyVersion !== REVIEW_VALIDATION_POLICY_VERSION)
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.VALIDATION_POLICY_OUTDATED,
      `The stored review was validated under policy version ${state.validationPolicyVersion}, but this filid supports only version ${REVIEW_VALIDATION_POLICY_VERSION}; its artifacts are preserved.`,
      REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.VALIDATION_POLICY_OUTDATED,
    );
}
