import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
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
      'The stored review uses an unsupported validation policy. Artifacts are preserved. After all prior actors finish, explicitly request --force to start a new review; this requires fresh review work.',
    );
}
