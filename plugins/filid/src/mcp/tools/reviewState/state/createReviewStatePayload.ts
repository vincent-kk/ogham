import { listReviewArtifacts } from './listReviewArtifacts.js';
import { reviewReportExists } from './reviewReportExists.js';
import {
  type CreateReviewStatePayloadInput,
  type ReviewStatePayload,
} from './reviewStateTypes.js';

const EMPTY_REVIEW_STATE_DIAGNOSTICS: NonNullable<
  CreateReviewStatePayloadInput['diagnostics']
> = Object.freeze([]);

export function createReviewStatePayload({
  action,
  disposition,
  paths,
  status,
  diagnostics = EMPTY_REVIEW_STATE_DIAGNOSTICS,
  state,
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
      ...(state ? { phase: state.phase, sourceHash: state.sourceHash } : {}),
      artifactCount: artifactPaths.length,
    },
    data: {
      disposition,
      reviewDirectory: paths.reviewDirectory,
      statePath: paths.statePath,
      artifactPaths,
      ...(reportPath ? { reportPath } : {}),
      ...(state ? { state } : {}),
    },
    diagnostics: [...diagnostics],
  };
}
