import { REVIEW_STATE_ACTIONS } from '../../../../../constants/reviewState.js';
import { handleReviewState } from '../../../../../mcp/tools/reviewState/index.js';
import type {
  ReviewEffort,
  ReviewStateRecord,
} from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import type { ReviewStateSealFixture } from './createReviewStateSealFixture.js';
import { readPreparedReviewState } from './readPreparedReviewState.js';

/**
 * Prepare the canonical v2 review state for a seal fixture.
 *
 * @param fixture Temporary repository and branch identity.
 * @param effort Reviewer round budget required by the case.
 * @returns Prepared state persisted by the real review_state action.
 */
export async function prepareReviewStateSealFixture(
  fixture: ReviewStateSealFixture,
  effort: ReviewEffort = 'low',
): Promise<ReviewStateRecord> {
  const prepared = await handleReviewState({
    action: REVIEW_STATE_ACTIONS.PREPARE,
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
    baseRef: 'main',
    effort,
  });
  return readPreparedReviewState(prepared);
}
