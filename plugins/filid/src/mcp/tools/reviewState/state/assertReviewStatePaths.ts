import { assertNoSymlinkDescendantsSync } from '@ogham/cross-platform';

import type { ReviewStatePaths } from './reviewStateTypes.js';

export function assertReviewStatePaths(paths: ReviewStatePaths): void {
  assertNoSymlinkDescendantsSync(paths.projectRoot, paths.reviewDirectory);
  assertNoSymlinkDescendantsSync(paths.projectRoot, paths.statePath);
  assertNoSymlinkDescendantsSync(paths.projectRoot, paths.reportPath);
}
