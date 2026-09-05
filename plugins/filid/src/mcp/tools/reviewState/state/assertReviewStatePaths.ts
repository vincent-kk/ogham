import { assertNoSymlinkDescendantsSync } from '@ogham/cross-platform';

import type { ReviewStatePaths } from './reviewStateTypes.js';

/**
 * Reject symlink traversal across canonical review-state paths.
 * @param paths Project-contained review paths to validate before file access.
 * @returns Nothing after every path is proven free of symlink descendants.
 */
export function assertReviewStatePaths(paths: ReviewStatePaths): void {
  assertNoSymlinkDescendantsSync(paths.projectRoot, paths.reviewRoot);
  assertNoSymlinkDescendantsSync(paths.reviewRoot, paths.reviewDirectory);
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.statePath);
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.reportPath);
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.evidencePath);
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.sessionPath);
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.prCommentPath);
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.fixRequestsPath);
  assertNoSymlinkDescendantsSync(
    paths.reviewDirectory,
    paths.opinionsDirectory,
  );
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.diffsDirectory);
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.briefsDirectory);
}
