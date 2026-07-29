import { REVIEW_STATE_GIT_ARGUMENTS } from '../../../../constants/reviewState.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';

/**
 * Count commits on HEAD that the upstream does not have.
 *
 * A branch with no upstream has never been pushed, which git reports as an
 * error rather than a count — that case returns null so the caller can tell it
 * apart from a branch that is genuinely up to date.
 * @param projectRoot Repository to count in.
 * @returns The commit count, or null when there is no upstream.
 */
export async function readUnpushedCommits(
  projectRoot: string,
): Promise<number | null> {
  try {
    const output = await executeReviewGit(
      projectRoot,
      REVIEW_STATE_GIT_ARGUMENTS.UPSTREAM_COUNT,
    );
    const count = Number.parseInt(output.trim(), 10);
    return Number.isNaN(count) ? null : count;
  } catch {
    return null;
  }
}
