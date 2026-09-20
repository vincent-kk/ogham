import { REVIEW_DETACHED_BRANCH_KEY } from '../../../../../constants/reviewState.js';
import { executeReviewGit } from '../../hash/executeReviewGit.js';

/**
 * Name the review of a detached HEAD after its commit, so CI runs without a branch still get a stable review key.
 *
 * Reads HEAD through the same `rev-parse HEAD` query prepare records as its head commit; inside one action the query runs once.
 *
 * @param projectRoot Absolute Git toplevel whose HEAD is detached.
 * @returns `detached-` followed by the first 12 characters of the HEAD commit id; the same HEAD always gives the same key.
 * @throws When Git cannot read HEAD.
 */
export async function readDetachedReviewKey(
  projectRoot: string,
): Promise<string> {
  const head = (
    await executeReviewGit(projectRoot, ['rev-parse', 'HEAD'])
  ).trim();
  return `${REVIEW_DETACHED_BRANCH_KEY.PREFIX}${head.slice(0, REVIEW_DETACHED_BRANCH_KEY.COMMIT_ID_LENGTH)}`;
}
