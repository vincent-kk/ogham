import { rmSync } from 'node:fs';

import type { REVIEW_STATE_ACTIONS } from '../../../../constants/reviewState.js';
import {
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_ERROR_MESSAGES,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { createReviewStatePayload } from '../state/createReviewStatePayload.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import type {
  ResolvedReviewStateInput,
  ReviewStatePayload,
} from '../state/reviewStateTypes.js';

type CleanupInput = Extract<
  ResolvedReviewStateInput,
  { action: typeof REVIEW_STATE_ACTIONS.CLEANUP }
>;

export async function cleanupReviewState(
  input: CleanupInput,
): Promise<ReviewStatePayload> {
  if (input.confirm !== true)
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.CLEANUP_CONFIRM_REQUIRED);
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  assertReviewStatePaths(paths);
  rmSync(paths.reviewDirectory, { recursive: true, force: true });

  return createReviewStatePayload({
    action: input.action,
    disposition: REVIEW_STATE_DISPOSITIONS.CLEANED,
    paths,
    status: TOOL_STATUSES.OK,
  });
}
