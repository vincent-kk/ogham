import { resolveContainedPath } from '@ogham/cross-platform';

/**
 * Resolve one canonical branch-scoped artifact in a review-state fixture.
 *
 * @param projectRoot - Absolute temporary repository root.
 * @param normalizedBranch - Prepared branch directory key.
 * @param relativePath - Review-directory-relative artifact path.
 * @returns Contained absolute artifact path.
 */
export function resolveReviewStateFixtureArtifact(
  projectRoot: string,
  normalizedBranch: string,
  relativePath: string,
): string {
  return resolveContainedPath(
    projectRoot,
    '.filid/review',
    normalizedBranch,
    relativePath,
  );
}
