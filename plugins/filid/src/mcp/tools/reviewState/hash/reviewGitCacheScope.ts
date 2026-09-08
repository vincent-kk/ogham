import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Outputs of read-only Git queries issued during one review_state action,
 * keyed by repository root and argument list. A pending promise is stored so
 * concurrent identical queries share one process.
 */
export type ReviewGitCache = Map<string, Promise<string>>;

/**
 * loaded by executeReviewGit; a store is present only inside
 * runWithReviewGitCache, and its presence decides whether a query is memoized.
 * Read through the async context rather than a parameter because the query
 * sites sit many call levels below the action entry point.
 */
export const reviewGitCacheScope = new AsyncLocalStorage<ReviewGitCache>();
