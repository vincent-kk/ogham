import {
  readUtf8FileIfExistsSync,
  removeFileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import type { REVIEW_STATE_ACTIONS } from '../../../../constants/reviewState.js';
import {
  PREPARE_ONCE_NEXT_ACTION,
  PREPARE_ONCE_REPEAT_TAIL,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_MESSAGES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
  WORKTREE_DISPOSITIONS,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { readProjectFacts } from '../../../../core/facts/index.js';
import {
  createDefaultConfig,
  loadConfig,
} from '../../../../core/index.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { renderChecklistBlock } from '../render/renderChecklistBlock.js';
import { renderFixRequests } from '../render/renderFixRequests.js';
import { renderPrComment } from '../render/renderPrComment.js';
import { renderReviewBlockers } from '../render/renderReviewBlockers.js';
import { renderReviewReport } from '../render/renderReviewReport.js';
import type { ReviewRenderInput } from '../render/reviewRenderTypes.js';
import { readReviewWorktree } from '../scope/readReviewWorktree.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { assertReviewValidationPolicy } from '../state/assertReviewValidationPolicy.js';
import { createReviewStatePayload } from '../state/createReviewStatePayload.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewArtifactPath } from '../state/resolveReviewArtifactPath.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import type {
  ResolvedReviewStateInput,
  ReviewSealPayload,
  ReviewStatePayload,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';
import { writeReviewState } from '../state/writeReviewState.js';
import { foldReviewVerdict } from '../verdict/foldReviewVerdict.js';

import { computeReviewArtifactHash } from '../hash/computeReviewArtifactHash.js';

import { assertReviewInputsFresh } from './utils/assertReviewInputsFresh.js';
import { detectFactsDiscrepancy } from './utils/detectFactsDiscrepancy.js';
import { readFrozenFacts } from '../state/readFrozenFacts.js';
import { createSealedReviewPayload } from './utils/createSealedReviewPayload.js';
import { loadSealGroupEvidence } from './utils/loadSealGroupEvidence.js';
import { readSealedReviewBlockers } from './utils/readSealedReviewBlockers.js';
import { readSealedReviewSummary } from './utils/readSealedReviewSummary.js';
import { resolvePrepareSettings } from './utils/resolvePrepareSettings.js';

/** Shared state-reading input shape accepted by checkpoint and seal. */
type CheckpointOrSealInput = Extract<
  ResolvedReviewStateInput,
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
          affects: [],
          nextAction: schemaMismatch
            ? PREPARE_ONCE_NEXT_ACTION
            : `Do not publish a verdict. After every in-flight actor finishes, call prepare once with the same arguments and without force: it prepares and reviews this branch from the start. ${PREPARE_ONCE_REPEAT_TAIL}`,
        },
      ],
    });
  }
  const state = restored;
  assertReviewValidationPolicy(state);
  const replacementDiagnostics = state.replacedFrom
    ? [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_REPLACED,
          message: `This generation replaced ${state.replacedFrom.priorGenerationId ?? 'an earlier generation'} (${state.replacedFrom.reason})${state.replacedFrom.priorVerdict ? `, which had published ${state.replacedFrom.priorVerdict}` : ''}.`,
          path: paths.statePath,
          affects: [],
          nextAction: REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.STATE_REPLACED,
        },
      ]
    : [];
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
          affects: [],
          nextAction: `Do not publish a verdict. After every in-flight actor finishes, call prepare once with the same arguments and without force: it prepares the current commits and reuses validated opinions for unchanged files. ${PREPARE_ONCE_REPEAT_TAIL}`,
        },
      ],
    });

  await assertReviewInputsFresh(state, paths, 'seal');
  const settings = resolvePrepareSettings({
    action: 'prepare',
    projectRoot: input.projectRoot,
  });
  const worktree = await readReviewWorktree(
    input.projectRoot,
    settings.generatedPaths,
  );
  if (state.phase === REVIEW_STATE_PHASES.SEALED) {
    const worktreeMoved =
      worktree.dirtyPathsHash !== state.scope.dirtyPathsHash ||
      worktree.worktree !== state.scope.worktree;
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
            affects: [],
            nextAction: `Do not publish a verdict. After every in-flight actor finishes, call prepare once with the same arguments and without force: it opens a generation from the validated opinions, so seal restores the report without new reviewer work. ${PREPARE_ONCE_REPEAT_TAIL}`,
          },
        ],
      });
    const blockers = readSealedReviewBlockers(paths, state);
    if (blockers.diagnostic)
      return createReviewStatePayload({
        action: input.action,
        disposition: REVIEW_STATE_DISPOSITIONS.STALE,
        paths,
        status: TOOL_STATUSES.INDETERMINATE,
        state,
        diagnostics: [blockers.diagnostic],
      });
    return createSealedReviewPayload({
      input,
      paths,
      summary,
      reuse: state.incremental?.summary,
      hasFixRequests: summary.verdict === 'REQUEST_CHANGES',
      blockersPath: blockers.blockersPath,
      diagnostics: [
        ...replacementDiagnostics,
        ...(worktreeMoved
          ? [
              {
                code: REVIEW_STATE_DIAGNOSTIC_CODES.WORKTREE_STALE,
                message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.WORKTREE_STALE,
                path: paths.statePath,
                affects: [],
                nextAction: REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.WORKTREE_STALE,
              },
            ]
          : []),
      ],
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
          affects: [],
          nextAction: `Do not publish a verdict. After every in-flight actor finishes, call prepare once with the same arguments and without force: it restores the session artifact and keeps validated progress. ${PREPARE_ONCE_REPEAT_TAIL}`,
        },
      ],
    });

  // Before the fold, and only while the phase can still change: a sealed
  // generation answers from its own record, never from a store that moved
  // after it (spec §9).
  const frozen = readFrozenFacts(paths.factsPath, state);
  if (frozen.status === 'unusable')
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.MISSING,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      state,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_FROZEN_UNUSABLE,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.FACTS_FROZEN_UNUSABLE,
          path: paths.factsPath,
          affects: [],
          nextAction:
            REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_FROZEN_UNUSABLE,
        },
      ],
    });
  const disputed =
    frozen.status === 'none'
      ? { diagnostics: [], items: [] }
      : detectFactsDiscrepancy(
          input.projectRoot,
          frozen.facts,
          await readProjectFacts(
            input.projectRoot,
            loadConfig(input.projectRoot).config ?? createDefaultConfig(),
          ),
        );
  if (disputed.diagnostics.length > 0)
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.STALE,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      state,
      diagnostics: disputed.diagnostics,
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
    worktree.worktree === WORKTREE_DISPOSITIONS.DOCUMENTS_ONLY ||
    worktree.worktree === WORKTREE_DISPOSITIONS.SOURCE_DIRTY;
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
          affects: [],
          nextAction: `Do not publish a verdict: no reviewable group has a merged opinion. After every in-flight actor finishes, call prepare once with the same arguments and without force and dispatch the handoffs it returns. ${PREPARE_ONCE_REPEAT_TAIL}`,
        },
      ],
    });

  const groupEvidence = loadSealGroupEvidence(
    paths,
    state.groups,
    state.sourceHash,
    state.scope.diagnostics,
  );
  const fold = foldReviewVerdict({
    evidence: {
      diagnostics: state.scope.diagnostics,
      sourceHash: state.sourceHash,
      snapshotHash: state.scope.snapshotHash,
      evidenceComplete: state.scope.evidenceComplete,
      structureStatus: state.scope.statuses.structure,
      verificationStatus: state.scope.statuses.verification,
      worktree: worktree.worktree,
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
      analysisAxes: state.scope.statuses.analysisAxes,
      sourceHash: state.sourceHash,
      snapshotHash: state.scope.snapshotHash,
      evidenceComplete: state.scope.evidenceComplete,
      structureStatus: state.scope.statuses.structure,
      verificationStatus: state.scope.statuses.verification,
      worktree: worktree.worktree,
    },
    files: state.scope.files,
    fold,
    reuse: state.incremental?.summary,
    ...(state.replacedFrom ? { replacedFrom: state.replacedFrom } : {}),
  };
  const report = renderReviewReport(renderInput);
  const blockers = renderReviewBlockers(renderInput);
  const fixRequests = renderFixRequests(renderInput);
  const prComment = renderPrComment(renderInput);
  const updatedSession = renderChecklistBlock(
    session,
    fold.checklist,
    state.incremental?.summary,
  );
  const sealedState: ReviewStateRecord = {
    ...state,
    scope: { ...state.scope, ...worktree },
    phase: REVIEW_STATE_PHASES.SEALED,
    sealedAt: generatedAt,
    verdict: fold.verdict,
    ...(frozen.status === 'none'
      ? {}
      : {
          factsAdjudications: disputed.items,
          factsAdjudicationsDigest: computeReviewArtifactHash(
            JSON.stringify(disputed.items),
          ),
        }),
  };

  writeFileAtomicallySync(paths.reportPath, report);
  if (blockers === null) removeFileIfExistsSync(paths.blockersPath);
  else writeFileAtomicallySync(paths.blockersPath, blockers);
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
      reviewComplete: fold.reviewComplete,
      filesTotal: fold.filesTotal,
      filesReviewed: fold.filesReviewed,
      filesSkipped: fold.filesSkipped,
      confirmed: fold.confirmed.length,
      refuted: fold.refuted.length,
      indeterminate: fold.indeterminate.length,
    },
    reuse: state.incremental?.summary,
    hasFixRequests: fixRequests !== null,
    blockersPath: blockers === null ? null : paths.blockersPath,
    diagnostics: replacementDiagnostics,
  });
}
