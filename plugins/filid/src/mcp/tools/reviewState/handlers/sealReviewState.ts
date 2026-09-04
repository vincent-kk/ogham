import {
  readUtf8FileIfExistsSync,
  removeFileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import type { REVIEW_STATE_ACTIONS } from '../../../../constants/reviewState.js';
import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_MESSAGES,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
  WORKTREE_DISPOSITIONS,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { renderChecklistBlock } from '../render/renderChecklistBlock.js';
import { renderFixRequests } from '../render/renderFixRequests.js';
import { renderPrComment } from '../render/renderPrComment.js';
import { renderReviewReport } from '../render/renderReviewReport.js';
import type { ReviewRenderInput } from '../render/reviewRenderTypes.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { createReviewStatePayload } from '../state/createReviewStatePayload.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import type {
  ReviewSealPayload,
  ReviewStateInput,
  ReviewStatePayload,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';
import { writeReviewState } from '../state/writeReviewState.js';
import { foldReviewVerdict } from '../verdict/foldReviewVerdict.js';

import { createSealedReviewPayload } from './utils/createSealedReviewPayload.js';
import { loadSealGroupEvidence } from './utils/loadSealGroupEvidence.js';
import { readSealedReviewSummary } from './utils/readSealedReviewSummary.js';
import { resolveReviewArtifactPath } from './validate/resolveReviewArtifactPath.js';

/** Shared state-reading input shape accepted by checkpoint and seal. */
type CheckpointOrSealInput = Extract<
  ReviewStateInput,
  Record<
    'action',
    typeof REVIEW_STATE_ACTIONS.CHECKPOINT | typeof REVIEW_STATE_ACTIONS.SEAL
  >
>;
/** Seal-specific narrowing used by the finalization handler. */
type SealInput = CheckpointOrSealInput & {
  action: typeof REVIEW_STATE_ACTIONS.SEAL;
};

/**
 * Fold trusted validated opinions and seal canonical review artifacts.
 *
 * @param input Validated seal request for one prepared branch review.
 * @returns Final verdict counts and canonical artifact paths, or diagnostics.
 */
export async function sealReviewState(
  input: SealInput,
): Promise<ReviewStatePayload | ReviewSealPayload> {
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

  if (state.phase === REVIEW_STATE_PHASES.SEALED) {
    const summary =
      state.verdict === null
        ? null
        : readSealedReviewSummary(paths.reportPath, state.verdict);
    if (summary === null)
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
    return createSealedReviewPayload({
      input,
      paths,
      summary,
      hasFixRequests: summary.verdict === 'REQUEST_CHANGES',
    });
  }

  const session = readUtf8FileIfExistsSync(paths.sessionPath);
  if (session === null)
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.MISSING,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      state,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.SESSION_MISSING,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.SESSION_MISSING,
          path: paths.sessionPath,
        },
      ],
    });

  const reviewableGroups = state.groups.filter(
    (group) => group.units.length > 0,
  );
  const hasMergedReview = reviewableGroups.some(
    (group) =>
      readUtf8FileIfExistsSync(
        resolveReviewArtifactPath(paths, group.opinionPath),
      ) !== null,
  );
  const worktreeForcesInconclusive =
    state.scope.worktree === WORKTREE_DISPOSITIONS.DOCUMENTS_ONLY ||
    state.scope.worktree === WORKTREE_DISPOSITIONS.SOURCE_DIRTY;
  if (
    reviewableGroups.length > 0 &&
    !hasMergedReview &&
    !worktreeForcesInconclusive
  )
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.MISSING,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      state,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.OPINIONS_MISSING,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.OPINIONS_MISSING,
          path: paths.opinionsDirectory,
        },
      ],
    });

  const groupEvidence = loadSealGroupEvidence(paths, state.groups);
  const fold = foldReviewVerdict({
    evidence: {
      sourceHash: state.sourceHash,
      snapshotHash: state.scope.snapshotHash,
      evidenceComplete: state.scope.evidenceComplete,
      structureStatus: state.scope.statuses.structure,
      verificationStatus: state.scope.statuses.verification,
      worktree: state.scope.worktree,
    },
    files: state.scope.files,
    candidates: state.scope.candidates,
    informational: state.scope.informational,
    groups: groupEvidence,
  });
  const generatedAt = new Date().toISOString();
  const renderInput: ReviewRenderInput = {
    branchName: state.branchName,
    baseRef: state.baseRef,
    reviewDirectory: paths.reviewDirectory,
    generatedAt,
    evidence: {
      sourceHash: state.sourceHash,
      snapshotHash: state.scope.snapshotHash,
      evidenceComplete: state.scope.evidenceComplete,
      structureStatus: state.scope.statuses.structure,
      verificationStatus: state.scope.statuses.verification,
      worktree: state.scope.worktree,
    },
    files: state.scope.files,
    fold,
  };
  const report = renderReviewReport(renderInput);
  const fixRequests = renderFixRequests(renderInput);
  const prComment = renderPrComment(renderInput);
  const updatedSession = renderChecklistBlock(session, fold.checklist);
  const sealedState: ReviewStateRecord = {
    ...state,
    phase: REVIEW_STATE_PHASES.SEALED,
    sealedAt: generatedAt,
    verdict: fold.verdict,
  };

  writeFileAtomicallySync(paths.reportPath, report);
  if (fixRequests === null) removeFileIfExistsSync(paths.fixRequestsPath);
  else writeFileAtomicallySync(paths.fixRequestsPath, fixRequests);
  writeFileAtomicallySync(paths.prCommentPath, prComment);
  writeFileAtomicallySync(paths.sessionPath, updatedSession);
  writeReviewState(paths.statePath, sealedState);
  return createSealedReviewPayload({
    input,
    paths,
    summary: {
      verdict: fold.verdict,
      filesTotal: fold.filesTotal,
      filesReviewed: fold.filesReviewed,
      filesSkipped: fold.filesSkipped,
      confirmed: fold.confirmed.length,
      refuted: fold.refuted.length,
      indeterminate: fold.indeterminate.length,
    },
    hasFixRequests: fixRequests !== null,
  });
}
