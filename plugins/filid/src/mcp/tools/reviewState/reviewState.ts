import { dispatchReviewState } from './handlers/dispatchReviewState.js';
import { runWithReviewGitCache } from './hash/runWithReviewGitCache.js';
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
 * Run one review-state action with Git queries shared for its duration.
 * @param args Untrusted host input whose action and required fields are checked before dispatch.
 * @returns The payload produced by the validated review-state action.
 */
export function handleReviewState(args: unknown): Promise<ReviewStateResult> {
  return runWithReviewGitCache(() => dispatchReviewState(args));
}
