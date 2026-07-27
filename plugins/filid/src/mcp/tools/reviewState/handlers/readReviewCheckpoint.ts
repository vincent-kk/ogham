import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_MESSAGES,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { createReviewStatePayload } from '../state/createReviewStatePayload.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import { reviewReportExists } from '../state/reviewReportExists.js';
import type {
  ReviewStateInput,
  ReviewStatePayload,
} from '../state/reviewStateTypes.js';

type CheckpointOrSealInput = Extract<
  ReviewStateInput,
  {
    action:
      typeof REVIEW_STATE_ACTIONS.CHECKPOINT | typeof REVIEW_STATE_ACTIONS.SEAL;
  }
>;
type CheckpointInput = CheckpointOrSealInput & {
  action: typeof REVIEW_STATE_ACTIONS.CHECKPOINT;
};

export async function readReviewCheckpoint(
  input: CheckpointInput,
): Promise<ReviewStatePayload> {
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  assertReviewStatePaths(paths);
  const state = readReviewState(paths.statePath);
  if (!state)
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.MISSING,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_MISSING,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.STATE_MISSING,
          path: paths.statePath,
        },
      ],
    });

  const source = await computeReviewSourceHash(
    input.projectRoot,
    input.baseRef ?? state.baseRef,
  );
  if (source.sourceHash !== state.sourceHash)
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.STALE,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      state,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.SOURCE_HASH_STALE,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.SOURCE_HASH_STALE,
          path: paths.statePath,
        },
      ],
    });

  if (
    state.phase === REVIEW_STATE_PHASES.SEALED &&
    !reviewReportExists(paths.reportPath)
  )
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.STALE,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      state,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.REPORT_MISSING,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.REPORT_MISSING,
          path: paths.reportPath,
        },
      ],
    });

  return createReviewStatePayload({
    action: input.action,
    disposition:
      state.phase === REVIEW_STATE_PHASES.SEALED
        ? REVIEW_STATE_DISPOSITIONS.CACHED
        : REVIEW_STATE_DISPOSITIONS.RESUMABLE,
    paths,
    status: TOOL_STATUSES.OK,
    state,
  });
}
