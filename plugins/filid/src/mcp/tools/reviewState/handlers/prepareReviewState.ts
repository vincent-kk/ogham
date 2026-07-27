import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
  REVIEW_STATE_SCHEMA_VERSION,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { clearStaleReviewArtifacts } from '../state/clearStaleReviewArtifacts.js';
import { createReviewStatePayload } from '../state/createReviewStatePayload.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import { reviewReportExists } from '../state/reviewReportExists.js';
import type {
  ReviewStateInput,
  ReviewStatePayload,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';
import { writeReviewState } from '../state/writeReviewState.js';

type PrepareInput = Extract<
  ReviewStateInput,
  { action: typeof REVIEW_STATE_ACTIONS.PREPARE }
>;

export async function prepareReviewState(
  input: PrepareInput,
): Promise<ReviewStatePayload> {
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  assertReviewStatePaths(paths);
  const source = await computeReviewSourceHash(
    input.projectRoot,
    input.baseRef,
  );
  const existing = readReviewState(paths.statePath);

  if (
    !input.force &&
    existing?.sourceHash === source.sourceHash &&
    existing.phase === REVIEW_STATE_PHASES.PREPARED
  )
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.RESUMABLE,
      paths,
      status: TOOL_STATUSES.OK,
      state: existing,
    });

  if (
    !input.force &&
    existing?.sourceHash === source.sourceHash &&
    existing.phase === REVIEW_STATE_PHASES.SEALED &&
    reviewReportExists(paths.reportPath)
  )
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.CACHED,
      paths,
      status: TOOL_STATUSES.OK,
      state: existing,
    });

  const state: ReviewStateRecord = {
    schemaVersion: REVIEW_STATE_SCHEMA_VERSION,
    projectRoot: input.projectRoot,
    branchName: input.branchName,
    normalizedBranch: paths.normalizedBranch,
    baseRef: input.baseRef,
    baseCommit: source.baseCommit,
    sourceHash: source.sourceHash,
    fileHashes: source.fileHashes,
    phase: REVIEW_STATE_PHASES.PREPARED,
    preparedAt: new Date().toISOString(),
  };
  clearStaleReviewArtifacts(paths);
  writeReviewState(paths.statePath, state);

  return createReviewStatePayload({
    action: input.action,
    disposition: REVIEW_STATE_DISPOSITIONS.FRESH,
    paths,
    status: TOOL_STATUSES.OK,
    state,
  });
}
