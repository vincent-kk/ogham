import type { ReviewScopeFile } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/**
 * Build one reviewable changed-file fixture for scope-selection tests.
 *
 * @param path Project-relative changed path.
 * @param owner Owning fractal path, or null when unowned.
 * @returns Complete reviewable changed-file fixture.
 */
export function createReviewScopeFileFixture(
  path: string,
  owner: string | null,
): ReviewScopeFile {
  return {
    path,
    change: 'M',
    role: 'source',
    owner,
    insertions: 1,
    deletions: 1,
    binary: false,
    skipReason: null,
    rules: [],
    repositoryRules: [],
  };
}
