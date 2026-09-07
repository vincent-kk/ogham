import { reviewGitCacheScope } from './reviewGitCacheScope.js';

/**
 * Run one review_state action with a fresh Git query cache in scope.
 *
 * The commit graph and refs cannot change while an action runs, so every
 * read-only query executeReviewGit issues inside `run` is answered once per
 * distinct root and argument list. Nothing is shared across actions.
 *
 * @param run The action body; every executeReviewGit call it reaches is memoized.
 * @returns Whatever `run` resolves to.
 * @throws Whatever `run` rejects with; the cache is discarded either way.
 */
export function runWithReviewGitCache<Result>(
  run: () => Promise<Result>,
): Promise<Result> {
  return reviewGitCacheScope.run(new Map(), run);
}
