import {
  REVIEW_SCOPE_DIRTY_PATH_LIMIT,
  REVIEW_STATE_DIRECTORY_NAMES,
  REVIEW_STATE_GIT_ARGUMENTS,
} from '../../../../constants/reviewState.js';
import { classifyWorktreePaths } from '../assess/classifyWorktreePaths.js';
import { parseGitStatusPaths } from '../assess/parseGitStatusPaths.js';
import { computeReviewDirtyPathsHash } from '../hash/computeReviewDirtyPathsHash.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';

import type { CollectedChangedScopeEvidence } from './changedScopeEvidenceTypes.js';

/**
 * Read current dirty paths without counting the review's own artifacts.
 * @param projectRoot Absolute repository root used for Git status.
 * @param generatedPaths Configured patterns allowed to remain uncommitted.
 * @returns Classification, bounded paths, and a digest of the complete path set.
 */
export async function readReviewWorktree(
  projectRoot: string,
  generatedPaths: readonly string[],
): Promise<
  Pick<
    CollectedChangedScopeEvidence,
    'worktree' | 'dirtyPaths' | 'dirtyPathsHash'
  >
> {
  const statusOutput = await executeReviewGit(projectRoot, [
    ...REVIEW_STATE_GIT_ARGUMENTS.STATUS_PORCELAIN,
  ]);
  const reviewPrefix = `${REVIEW_STATE_DIRECTORY_NAMES.FILID}/${REVIEW_STATE_DIRECTORY_NAMES.REVIEW}`;
  const dirtyPaths = parseGitStatusPaths(statusOutput)
    .filter(
      (path) => path !== reviewPrefix && !path.startsWith(`${reviewPrefix}/`),
    )
    .sort();
  return {
    worktree: classifyWorktreePaths(dirtyPaths, generatedPaths).disposition,
    dirtyPaths: dirtyPaths.slice(0, REVIEW_SCOPE_DIRTY_PATH_LIMIT),
    dirtyPathsHash: computeReviewDirtyPathsHash(dirtyPaths),
  };
}
