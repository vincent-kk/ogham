import {
  assertNoSymlinkDescendantsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import type { ReviewStatePaths } from './reviewStateTypes.js';

/**
 * Resolve and guard a state-owned review artifact path.
 *
 * @param paths Canonical branch review paths.
 * @param relativePath State-stored review-directory-relative path.
 * @returns Absolute path contained beneath the branch review directory.
 */
export function resolveReviewArtifactPath(
  paths: ReviewStatePaths,
  relativePath: string,
): string {
  const absolutePath = resolveContainedPath(
    paths.reviewDirectory,
    relativePath,
  );
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, absolutePath);
  return absolutePath;
}
