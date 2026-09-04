import { resolveContainedPath } from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIRECTORY_NAMES,
  REVIEW_STATE_FILE_NAMES,
} from '../../../../constants/reviewState.js';

import { normalizeReviewBranch } from './normalizeReviewBranch.js';
import type { ReviewStatePaths } from './reviewStateTypes.js';

/**
 * Resolve contained canonical artifact paths for one branch review.
 * @param projectRoot Absolute project root that owns the review directory.
 * @param branchName Unnormalized branch key used for review isolation.
 * @returns Every canonical file and directory path owned by the branch review.
 */
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
    evidencePath: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_FILE_NAMES.EVIDENCE,
    ),
    sessionPath: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_FILE_NAMES.SESSION,
    ),
    prCommentPath: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_FILE_NAMES.PR_COMMENT,
    ),
    fixRequestsPath: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_FILE_NAMES.FIX_REQUESTS,
    ),
    opinionsDirectory: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_DIRECTORY_NAMES.OPINIONS,
    ),
    diffsDirectory: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_DIRECTORY_NAMES.DIFFS,
    ),
    briefsDirectory: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_DIRECTORY_NAMES.BRIEFS,
    ),
  };
}
