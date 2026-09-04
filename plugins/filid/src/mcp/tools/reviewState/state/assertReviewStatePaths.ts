import { assertNoSymlinkDescendantsSync } from '@ogham/cross-platform';

import type { ReviewStatePaths } from './reviewStateTypes.js';

/**
 * Reject symlink traversal across canonical review-state paths.
 * @param paths Project-contained review paths to validate before file access.
 * @returns Nothing after every path is proven free of symlink descendants.
 */
export function assertReviewStatePaths(paths: ReviewStatePaths): void {
  assertNoSymlinkDescendantsSync(paths.projectRoot, paths.reviewDirectory);
  assertNoSymlinkDescendantsSync(paths.projectRoot, paths.statePath);
  assertNoSymlinkDescendantsSync(paths.projectRoot, paths.reportPath);
  assertNoSymlinkDescendantsSync(paths.projectRoot, paths.evidencePath);
}
