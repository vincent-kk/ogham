import {
  assertNoSymlinkDescendantsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIRECTORY_NAMES,
  REVIEW_STATE_FILE_NAMES,
} from '../../../../constants/reviewState.js';

import { normalizeReviewBranch } from './normalizeReviewBranch.js';
import { readReviewState } from './readReviewState.js';
import { resolveReviewGenerationPaths } from './resolveReviewGenerationPaths.js';
import type { ReviewStatePaths } from './reviewStateTypes.js';

/**
 * Compute the legacy branch-root paths without reading persisted state.
 * @param projectRoot Absolute project root that owns the review directory.
 * @param branchName Unnormalized branch key used for review isolation.
 * @returns Canonical branch-root paths, ignoring any active generation.
 */
export function resolveLegacyReviewStatePaths(
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

  const paths: ReviewStatePaths = {
    projectRoot,
    normalizedBranch,
    reviewRoot,
    reviewDirectory,
    statePath: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_FILE_NAMES.STATE,
    ),
    handoffPath: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_FILE_NAMES.HANDOFF,
    ),
    reportPath: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_FILE_NAMES.REPORT,
    ),
    blockersPath: resolveContainedPath(
      reviewDirectory,
      REVIEW_STATE_FILE_NAMES.BLOCKERS,
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
  return paths;
}

/**
 * Read the branch state file and resolve it to the active generation's paths.
 * @param projectRoot Absolute project root that owns the review directory.
 * @param branchName Unnormalized branch key used for review isolation.
 * @returns Every canonical file and directory path owned by the active generation.
 * @throws When a path crosses a symlink, the state file is corrupted, or its generation ID is malformed.
 */
export function resolveReviewStatePaths(
  projectRoot: string,
  branchName: string,
): ReviewStatePaths {
  const paths = resolveLegacyReviewStatePaths(projectRoot, branchName);
  assertNoSymlinkDescendantsSync(projectRoot, paths.statePath);
  const state = readReviewState(paths.statePath);
  return state && !('kind' in state) && state.generationId
    ? resolveReviewGenerationPaths(paths, state.generationId)
    : paths;
}
