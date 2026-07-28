import { resolveContainedPath } from '@ogham/cross-platform/paths';

import {
  REVIEW_STATE_DIRECTORY_NAMES,
  REVIEW_STATE_FILE_NAMES,
} from '../../../../constants/reviewState.js';

import { normalizeReviewBranch } from './normalizeReviewBranch.js';
import type { ReviewStatePaths } from './reviewStateTypes.js';

export function resolveReviewStatePaths(
  projectRoot: string,
  branchName: string,
): ReviewStatePaths {
  const normalizedBranch = normalizeReviewBranch(branchName);
  const reviewRoot = resolveContainedPath(
    projectRoot,
    REVIEW_STATE_DIRECTORY_NAMES.FILID,
    REVIEW_STATE_DIRECTORY_NAMES.REVIEW,
  );
  const reviewDirectory = resolveContainedPath(reviewRoot, normalizedBranch);

  return {
    projectRoot,
    normalizedBranch,
    reviewRoot,
    reviewDirectory,
    statePath: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_FILE_NAMES.STATE,
    ),
    reportPath: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_FILE_NAMES.REPORT,
    ),
  };
}
