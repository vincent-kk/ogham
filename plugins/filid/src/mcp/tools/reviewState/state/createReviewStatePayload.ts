import { listReviewArtifacts } from './listReviewArtifacts.js';
import { reviewReportExists } from './reviewReportExists.js';
import {
  type CreateReviewStatePayloadInput,
  type ReviewStatePayload,
} from './reviewStateTypes.js';

/** Shared immutable diagnostics default for successful lifecycle payloads. */
const EMPTY_REVIEW_STATE_DIAGNOSTICS: NonNullable<
  CreateReviewStatePayloadInput['diagnostics']
> = Object.freeze([]);

/**
 * Project canonical state into the bounded public lifecycle envelope.
 * @param input Lifecycle action, paths, status, optional state, and diagnostics.
 * @returns Bounded review-state payload with prepared facts restored from state.
 */
export function createReviewStatePayload({
  action,
  disposition,
  paths,
  status,
  diagnostics = EMPTY_REVIEW_STATE_DIAGNOSTICS,
  state,
  concurrency,
  artifacts,
}: CreateReviewStatePayloadInput): ReviewStatePayload {
  const artifactPaths = listReviewArtifacts(paths.reviewDirectory);
  const reportPath = reviewReportExists(paths.reportPath)
    ? paths.reportPath
    : undefined;

  return {
    projectRoot: paths.projectRoot,
    status,
    summary: {
      action,
      disposition,
      ...(state
        ? {
            phase: state.phase,
            sourceHash: state.sourceHash,
            snapshotHash: state.scope.snapshotHash,
            filesTotal: state.scope.files.length,
            unitsTotal: state.groups.reduce(
              (total, group) => total + group.units.length,
              0,
            ),
            groupsTotal: state.groups.length,
            candidateCount: state.scope.candidates.length,
            evidenceComplete: state.scope.evidenceComplete,
            worktree: state.scope.worktree,
            effort: state.effort,
            ...(state.verdict === null ? {} : { verdict: state.verdict }),
          }
        : {}),
      ...(concurrency === undefined ? {} : { concurrency }),
      artifactCount: artifactPaths.length,
    },
    data: {
      disposition,
      reviewDirectory: paths.reviewDirectory,
      statePath: paths.statePath,
      artifactPaths,
      ...(reportPath ? { reportPath } : {}),
      ...(state
        ? {
            state,
            evidencePath: paths.evidencePath,
            sessionPath: paths.sessionPath,
            files: state.scope.files,
            groups: state.groups,
            candidates: state.scope.candidates,
            outOfScopeCount: state.scope.outOfScopeCount,
            infoCount: state.scope.infoCount,
            dirtyPaths: state.scope.dirtyPaths,
            statuses: state.scope.statuses,
          }
        : {}),
      ...(artifacts === undefined ? {} : { artifacts }),
    },
    diagnostics: [...diagnostics],
  };
}
