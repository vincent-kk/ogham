import { requireAbsoluteRoot } from '@ogham/cross-platform';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_ACTION_VALUES,
  REVIEW_STATE_ERROR_MESSAGES,
} from '../../../constants/reviewState.js';

import { assessReviewState } from './handlers/assessReviewState.js';
import { cleanupReviewState } from './handlers/cleanupReviewState.js';
import { prepareReviewState } from './handlers/prepareReviewState.js';
import { readReviewCheckpoint } from './handlers/readReviewCheckpoint.js';
import { sealReviewState } from './handlers/sealReviewState.js';
import { validateReviewOpinion } from './handlers/validateReviewOpinion.js';
import type {
  ReviewStateInput,
  ReviewStateResult,
  ReviewStateResultFor,
} from './state/reviewStateTypes.js';

/**
 * Dispatch one review_state action.
 * @param args Unvalidated tool input; shape is checked here before dispatch.
 * @returns The common payload; which fields carry meaning depends on the action.
 */
export function handleReviewState<Input extends ReviewStateInput>(
  args: Input,
): Promise<ReviewStateResultFor<Input>>;
/**
 * Accept untrusted host input while preserving the common result boundary.
 * @param args Untrusted host input whose action and required fields are checked before dispatch.
 * @returns The payload produced by the validated review-state action.
 */
export function handleReviewState(args: unknown): Promise<ReviewStateResult>;
/**
 * Validate untrusted input and dispatch it to one review-state action.
 * @param args Untrusted host input whose action and required fields are checked before dispatch.
 * @returns The payload produced by the validated review-state action.
 */
export async function handleReviewState(
  args: unknown,
): Promise<ReviewStateResult> {
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
    case REVIEW_STATE_ACTIONS.VALIDATE:
      return validateReviewOpinion(input);
    case REVIEW_STATE_ACTIONS.SEAL:
      return sealReviewState({
        ...input,
        action: REVIEW_STATE_ACTIONS.SEAL,
      });
    case REVIEW_STATE_ACTIONS.CLEANUP:
      if (input.confirm !== true)
        throw new Error(REVIEW_STATE_ERROR_MESSAGES.CLEANUP_CONFIRM_REQUIRED);
      return cleanupReviewState(input);
    case REVIEW_STATE_ACTIONS.ASSESS:
      return assessReviewState({
        ...input,
        action: REVIEW_STATE_ACTIONS.ASSESS,
        ...(typeof candidate.hasPullRequest === 'boolean'
          ? { hasPullRequest: candidate.hasPullRequest }
          : {}),
      });
  }
}
