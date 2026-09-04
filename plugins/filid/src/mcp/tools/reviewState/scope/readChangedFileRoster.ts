import {
  REVIEW_STATE_GIT,
  REVIEW_STATE_GIT_ARGUMENTS,
} from '../../../../constants/reviewState.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';
import type { ReviewChangedFile } from '../state/reviewStateTypes.js';

import { parseChangedFileChurn } from './utils/parseChangedFileChurn.js';
import { parseChangedFileStatuses } from './utils/parseChangedFileStatuses.js';

/**
 * Read the committed changed-file roster and churn from Git.
 * @param projectRoot Absolute repository root for the Git calls.
 * @param baseCommit Merge-base commit stored in prepared review state.
 * @returns Path-sorted A/M/D roster with numeric churn.
 */
export async function readChangedFileRoster(
  projectRoot: string,
  baseCommit: string,
): Promise<ReviewChangedFile[]> {
  const range = `${baseCommit}${REVIEW_STATE_GIT.RANGE_SEPARATOR}${REVIEW_STATE_GIT.HEAD}`;
  const statusOutput = await executeReviewGit(projectRoot, [
    REVIEW_STATE_GIT.DIFF,
    ...REVIEW_STATE_GIT_ARGUMENTS.DIFF_COMMITTED_STATUS,
    range,
    REVIEW_STATE_GIT.END_OF_OPTIONS,
  ]);
  const churnOutput = await executeReviewGit(projectRoot, [
    REVIEW_STATE_GIT.DIFF,
    ...REVIEW_STATE_GIT_ARGUMENTS.DIFF_COMMITTED_NUMSTAT,
    range,
    REVIEW_STATE_GIT.END_OF_OPTIONS,
  ]);
  const statuses = parseChangedFileStatuses(statusOutput);
  const churn = parseChangedFileChurn(churnOutput);
  return [...statuses]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, change]) => {
      const counts = churn.get(path);
      if (!counts) throw new Error(`git diff --numstat omitted ${path}`);
      return { path, change, ...counts };
    });
}
