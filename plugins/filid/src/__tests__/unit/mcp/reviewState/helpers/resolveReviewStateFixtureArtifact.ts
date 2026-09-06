import {
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

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
  const statePath = resolveContainedPath(
    projectRoot,
    '.filid/review',
    normalizedBranch,
    'review-state.json',
  );
  const state = JSON.parse(readUtf8FileIfExistsSync(statePath) ?? '{}');
  if (relativePath !== 'review-state.json' && state.generationId)
    return resolveContainedPath(
      projectRoot,
      '.filid/review',
      normalizedBranch,
      'generations',
      state.generationId,
      relativePath,
    );
  return resolveContainedPath(
    projectRoot,
    '.filid/review',
    normalizedBranch,
    relativePath,
  );
}
