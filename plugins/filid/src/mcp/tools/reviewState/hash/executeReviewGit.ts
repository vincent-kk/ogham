import { REVIEW_STATE_GIT } from '../../../../constants/reviewState.js';

import { reviewGitCacheScope } from './reviewGitCacheScope.js';
import { spawnReviewGit } from './spawnReviewGit.js';

/**
 * Subcommands that read the working tree. An action writes review artifacts
 * while it runs, so their output can change between two calls in one action.
 */
const WORKTREE_QUERIES = new Set(['status']);

/**
 * Read from Git for a review_state action, sharing identical read-only
 * queries within the action.
 *
 * Inside runWithReviewGitCache, a query with the same root, arguments and
 * input as an earlier one returns the earlier output — or joins its pending process —
 * except working-tree queries, which always spawn. A failed query is not
 * cached, so a retry spawns again. Outside a cache scope every call spawns.
 *
 * @param projectRoot Absolute repository root the command runs in.
 * @param args Git arguments, passed verbatim without a shell.
 * @param input Text handed to Git on standard input; none when omitted.
 * @returns Raw standard output with line endings untouched.
 * @throws When Git cannot be spawned, times out, or exits non-zero.
 */
export function executeReviewGit(
  projectRoot: string,
  args: readonly string[],
  input?: string,
): Promise<string> {
  const cache = reviewGitCacheScope.getStore();
  if (!cache || WORKTREE_QUERIES.has(args[0] ?? ''))
    return spawnReviewGit(projectRoot, args, input);
  const key = [projectRoot, ...args, input ?? ''].join(
    REVIEW_STATE_GIT.RECORD_SEPARATOR,
  );
  const pending = cache.get(key);
  if (pending) return pending;
  const output = spawnReviewGit(projectRoot, args, input);
  cache.set(key, output);
  output.catch(() => cache.delete(key));
  return output;
}
