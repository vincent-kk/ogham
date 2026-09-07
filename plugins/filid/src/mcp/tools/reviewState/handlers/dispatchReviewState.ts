import { requireAbsoluteRoot } from '@ogham/cross-platform';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_ACTION_VALUES,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_ERROR_MESSAGES,
} from '../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';
import { readChangeContextFile } from '../scope/readChangeContextFile.js';
import type {
  ResolvedReviewStateInput,
  ReviewStateResult,
} from '../state/reviewStateTypes.js';

import { assessReviewState } from './assessReviewState.js';
import { buildReviewHandoff } from './buildReviewHandoff.js';
import { cleanupReviewState } from './cleanupReviewState.js';
import { prepareReviewState } from './prepareReviewState.js';
import { readReviewCheckpoint } from './readReviewCheckpoint.js';
import { sealReviewState } from './sealReviewState.js';
import { validateReviewOpinion } from './validateReviewOpinion.js';

/**
 * Validate untrusted input and dispatch it to one review-state action.
 *
 * Called only from handleReviewState, which supplies the Git query cache
 * scope this dispatch and every handler below it rely on.
 *
 * @param args Untrusted host input whose action and required fields are checked before dispatch.
 * @returns The payload produced by the validated review-state action.
 * @throws When the input shape, action, or Git identity is invalid.
 */
export async function dispatchReviewState(
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
  if (
    candidate.branchName !== undefined &&
    typeof candidate.branchName !== 'string'
  )
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.BRANCH_NAME_REQUIRED);
  const projectRoot = (
    await executeReviewGit(requireAbsoluteRoot(candidate.projectRoot), [
      'rev-parse',
      '--show-toplevel',
    ])
  ).trim();
  const branchName =
    candidate.branchName ??
    (await executeReviewGit(projectRoot, ['branch', '--show-current'])).trim();
  if (candidate.branchName === undefined && !branchName)
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.BRANCH_UNRESOLVED,
      'The current Git branch could not be resolved. Supply branchName for a detached HEAD.',
    );
  const input = {
    ...candidate,
    projectRoot,
    branchName,
  } as ResolvedReviewStateInput;

  switch (input.action) {
    case REVIEW_STATE_ACTIONS.PREPARE: {
      if (
        input.changeContext !== undefined &&
        typeof input.changeContext !== 'string'
      )
        throw new Error(REVIEW_STATE_ERROR_MESSAGES.CHANGE_CONTEXT_INVALID);
      if (
        input.changeContextPath !== undefined &&
        typeof input.changeContextPath !== 'string'
      )
        throw new Error(
          REVIEW_STATE_ERROR_MESSAGES.CHANGE_CONTEXT_PATH_INVALID,
        );
      if (
        input.changeContext !== undefined &&
        input.changeContextPath !== undefined
      )
        throw new Error(REVIEW_STATE_ERROR_MESSAGES.CHANGE_CONTEXT_CONFLICT);
      const { changeContextPath, ...prepareInput } = input;
      return prepareReviewState({
        ...prepareInput,
        ...(changeContextPath === undefined
          ? {}
          : { changeContext: readChangeContextFile(changeContextPath) }),
      });
    }
    case REVIEW_STATE_ACTIONS.HANDOFF:
      return buildReviewHandoff(input);
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
