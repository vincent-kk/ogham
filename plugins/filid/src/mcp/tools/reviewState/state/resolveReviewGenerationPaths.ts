import {
  assertNoSymlinkDescendantsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { REVIEW_STATE_FILE_NAMES } from '../../../../constants/reviewState.js';

import type { ReviewStatePaths } from './reviewStateTypes.js';

/**
 * Resolve isolated artifacts while retaining the branch's active state address.
 * @param paths Canonical branch paths, possibly from another generation.
 * @param generationId Tool-generated lowercase 128-bit hexadecimal identifier.
 * @returns Guarded generation paths; this function creates no directories.
 * @throws When the ID is malformed or any existing descendant is a symlink.
 */
export function resolveReviewGenerationPaths(
  paths: ReviewStatePaths,
  generationId: string,
): ReviewStatePaths {
  if (!/^[a-f0-9]{32}$/.test(generationId))
    throw new Error('invalid review generation ID');
  const branchDirectory = resolveContainedPath(
    paths.reviewRoot,
    paths.normalizedBranch,
  );
  const reviewDirectory = resolveContainedPath(
    branchDirectory,
    'generations',
    generationId,
  );
  assertNoSymlinkDescendantsSync(paths.projectRoot, reviewDirectory);
  const resolved: ReviewStatePaths = {
    ...paths,
    reviewDirectory,
    statePath: resolveContainedPath(
      branchDirectory,
      REVIEW_STATE_FILE_NAMES.STATE,
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
    opinionsDirectory: resolveContainedPath(reviewDirectory, 'opinions'),
    diffsDirectory: resolveContainedPath(reviewDirectory, 'diffs'),
    briefsDirectory: resolveContainedPath(reviewDirectory, 'briefs'),
  };
  for (const path of [
    resolved.statePath,
    resolved.reportPath,
    resolved.blockersPath,
    resolved.evidencePath,
    resolved.sessionPath,
    resolved.prCommentPath,
    resolved.fixRequestsPath,
    resolved.opinionsDirectory,
    resolved.diffsDirectory,
    resolved.briefsDirectory,
  ])
    assertNoSymlinkDescendantsSync(paths.projectRoot, path);
  return resolved;
}
