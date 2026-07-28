import { requireAbsoluteRoot } from '@ogham/cross-platform/host-paths';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_ACTION_VALUES,
  REVIEW_STATE_ERROR_MESSAGES,
} from '../../../constants/reviewState.js';

import { cleanupReviewState } from './handlers/cleanupReviewState.js';
import { prepareReviewState } from './handlers/prepareReviewState.js';
import { readReviewCheckpoint } from './handlers/readReviewCheckpoint.js';
import { sealReviewState } from './handlers/sealReviewState.js';
import type {
  ReviewStateInput,
  ReviewStatePayload,
} from './state/reviewStateTypes.js';

export async function handleReviewState(
  args: unknown,
): Promise<ReviewStatePayload> {
  if (!args || typeof args !== 'object')
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.INPUT_OBJECT_REQUIRED);
  const candidate = args as Record<string, unknown>;
  if (
    typeof candidate.action !== 'string' ||
    !REVIEW_STATE_ACTION_VALUES.includes(
      candidate.action as (typeof REVIEW_STATE_ACTION_VALUES)[number],
    )
  )
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.ACTION_INVALID);
  if (typeof candidate.projectRoot !== 'string' || !candidate.projectRoot)
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.PROJECT_ROOT_REQUIRED);
  if (typeof candidate.branchName !== 'string')
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.BRANCH_NAME_REQUIRED);

  const input = {
    ...candidate,
    projectRoot: requireAbsoluteRoot(candidate.projectRoot),
  } as ReviewStateInput;

  switch (input.action) {
    case REVIEW_STATE_ACTIONS.PREPARE:
      if (!input.baseRef)
        throw new Error(REVIEW_STATE_ERROR_MESSAGES.BASE_REF_REQUIRED);
      return prepareReviewState(input);
    case REVIEW_STATE_ACTIONS.CHECKPOINT:
      return readReviewCheckpoint({
        ...input,
        action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      });
    case REVIEW_STATE_ACTIONS.SEAL:
      return sealReviewState({
        ...input,
        action: REVIEW_STATE_ACTIONS.SEAL,
      });
    case REVIEW_STATE_ACTIONS.CLEANUP:
      if (input.confirm !== true)
        throw new Error(REVIEW_STATE_ERROR_MESSAGES.CLEANUP_CONFIRM_REQUIRED);
      return cleanupReviewState(input);
  }
}
