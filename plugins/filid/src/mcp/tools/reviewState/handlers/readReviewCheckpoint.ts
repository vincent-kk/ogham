import type { REVIEW_STATE_ACTIONS } from '../../../../constants/reviewState.js';
import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_MESSAGES,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { planNextHandoffs } from '../handoff/planNextHandoffs.js';
import { readReviewGroupArtifactStatus } from '../handoff/readReviewGroupArtifactStatus.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { createReviewStatePayload } from '../state/createReviewStatePayload.js';
import { readReviewArtifactPresence } from '../state/readReviewArtifactPresence.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import { reviewReportExists } from '../state/reviewReportExists.js';
import type {
  ResolvedReviewStateInput,
  ReviewStatePayload,
} from '../state/reviewStateTypes.js';

/** Shared state-reading input shape accepted by checkpoint and seal. */
type CheckpointOrSealInput = Extract<
  ResolvedReviewStateInput,
  Record<
    'action',
    typeof REVIEW_STATE_ACTIONS.CHECKPOINT | typeof REVIEW_STATE_ACTIONS.SEAL
  >
>;
/** Checkpoint-specific narrowing used by the read-only handler. */
type CheckpointInput = CheckpointOrSealInput &
  Record<'action', typeof REVIEW_STATE_ACTIONS.CHECKPOINT>;

/**
 * Read current branch review state and resume-relevant artifact presence.
 *
 * @param input Validated checkpoint request for one branch review.
 * @returns Read-only lifecycle payload with state and artifact presence facts.
 */
export async function readReviewCheckpoint(
  input: CheckpointInput,
): Promise<ReviewStatePayload> {
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  assertReviewStatePaths(paths);
  const restored = readReviewState(paths.statePath);
  if (restored === null || 'kind' in restored) {
    const schemaMismatch = restored !== null;
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.MISSING,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      handoff: { next: [], sealReady: false },
      diagnostics: [
        {
          code: schemaMismatch
            ? REVIEW_STATE_DIAGNOSTIC_CODES.STATE_SCHEMA_MISMATCH
            : REVIEW_STATE_DIAGNOSTIC_CODES.STATE_MISSING,
          message: schemaMismatch
            ? REVIEW_STATE_DIAGNOSTIC_MESSAGES.STATE_SCHEMA_MISMATCH
            : REVIEW_STATE_DIAGNOSTIC_MESSAGES.STATE_MISSING,
          path: paths.statePath,
        },
      ],
    });
  }
  const state = restored;
  const artifacts = readReviewArtifactPresence(paths, state);
  const handoff = planNextHandoffs({
    state,
    paths,
    statuses: readReviewGroupArtifactStatus(state, paths),
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
      artifacts,
      handoff,
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
      artifacts,
      handoff,
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
    artifacts,
    handoff,
  });
}
