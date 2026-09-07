import { resolveContainedPath } from '@ogham/cross-platform';

/**
 * Resolve one artifact below an already canonical fixture review directory.
 *
 * @param reviewDirectory - Absolute prepared review directory.
 * @param relativePath - Review-directory-relative artifact path.
 * @returns Contained absolute artifact path.
 */
export function resolveReviewArtifactFromDirectory(
  reviewDirectory: string,
  relativePath: string,
): string {
  return resolveContainedPath(reviewDirectory, relativePath);
}
