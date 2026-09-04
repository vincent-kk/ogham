import {
  resolveContainedPath,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_VALIDATE_KINDS,
} from '../../../../../constants/reviewState.js';
import { handleReviewState } from '../../../../../mcp/tools/reviewState/index.js';
import type { ReviewStateRecord } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildVerifyOpinion } from './buildVerifyOpinion.js';
import type { ReviewStateSealFixture } from './createReviewStateSealFixture.js';
import { readPersistedReviewState } from './readPersistedReviewState.js';

/** One valid verifier decision used by a seal integration fixture. */
export interface ReviewStateSealDecision {
  /** Reviewer or FCA finding identifier being decided. */
  findingId: string;
  /** Deterministic verifier outcome. */
  verdict: 'CONFIRMED' | 'REFUTED' | 'INDETERMINATE';
  /** Concrete evidence supporting the decision. */
  evidence: string;
  /** Falsifiable explanation for the decision. */
  reason: string;
}

/** Inputs needed to validate one complete reviewer/verifier pair. */
export interface ValidateReviewStateSealGroupInput {
  /** Temporary repository and branch identity. */
  fixture: ReviewStateSealFixture;
  /** Prepared state containing exactly one reviewable group. */
  state: ReviewStateRecord;
  /** Structurally valid round-one reviewer JSON value. */
  opinion: Record<string, unknown>;
  /** Complete decisions required by the verifier contract. */
  decisions: readonly ReviewStateSealDecision[];
}

/**
 * Persist and validate one complete reviewer/verifier artifact pair.
 *
 * @param input Prepared fixture, reviewer opinion, and verifier decisions.
 * @returns State returned by the real verifier validation action.
 */
export async function validateReviewStateSealGroup(
  input: ValidateReviewStateSealGroupInput,
): Promise<ReviewStateRecord> {
  const group = input.state.groups[0];
  if (!group) throw new Error('seal fixture did not create a review group');
  const reviewDirectory = resolveContainedPath(
    input.fixture.projectRoot,
    '.filid/review',
    input.state.normalizedBranch,
  );
  writeFileAtomicallySync(
    resolveContainedPath(
      reviewDirectory,
      `opinions/review-${group.id}.r1.json`,
    ),
    `${JSON.stringify(input.opinion)}\n`,
  );
  const review = await handleReviewState({
    action: REVIEW_STATE_ACTIONS.VALIDATE,
    projectRoot: input.fixture.projectRoot,
    branchName: input.fixture.branchName,
    kind: REVIEW_VALIDATE_KINDS.REVIEW,
    group: group.id,
    round: 1,
  });
  if (!review.summary.ok)
    throw new Error('seal fixture review validation failed');
  const reviewedState = readPersistedReviewState(
    input.fixture.projectRoot,
    input.state.normalizedBranch,
  );
  writeFileAtomicallySync(
    resolveContainedPath(reviewDirectory, group.verifyPath),
    `${JSON.stringify(
      buildVerifyOpinion(reviewedState, group.id, input.decisions),
    )}\n`,
  );
  const verify = await handleReviewState({
    action: REVIEW_STATE_ACTIONS.VALIDATE,
    projectRoot: input.fixture.projectRoot,
    branchName: input.fixture.branchName,
    kind: REVIEW_VALIDATE_KINDS.VERIFY,
    group: group.id,
  });
  if (!verify.summary.ok)
    throw new Error('seal fixture verifier validation failed');
  return readPersistedReviewState(
    input.fixture.projectRoot,
    input.state.normalizedBranch,
  );
}
