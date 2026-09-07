import { REVIEW_STATE_ACTIONS } from '../../../../../constants/reviewState.js';
import { handleReviewState } from '../../../../../mcp/tools/reviewState/index.js';
import type {
  ReviewEffort,
  ReviewStateRecord,
} from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { readPreparedReviewState } from './readPreparedReviewState.js';

/**
 * Prepare and return persisted state for a validation fixture.
 *
 * @param projectRoot - Absolute temporary Git repository root.
 * @param branchName - Fixture branch whose artifacts are prepared.
 * @param effort - Optional reviewer effort overriding the fixture config.
 * @returns Canonical prepared state referenced by review_state.
 * @throws When prepare does not reference a readable v2 state.
 */
export async function prepareReviewStateFixture(
  projectRoot: string,
  branchName: string,
  effort?: ReviewEffort,
): Promise<ReviewStateRecord> {
  const prepared = await handleReviewState({
    action: REVIEW_STATE_ACTIONS.PREPARE,
    projectRoot,
    branchName,
    baseRef: 'main',
    ...(effort ? { effort } : {}),
  });
  return readPreparedReviewState(prepared);
}
