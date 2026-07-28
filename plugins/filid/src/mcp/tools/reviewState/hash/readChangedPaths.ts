import {
  REVIEW_STATE_GIT,
  REVIEW_STATE_GIT_ARGUMENTS,
} from '../../../../constants/reviewState.js';

import { executeReviewGit } from './executeReviewGit.js';

export async function readChangedPaths(
  projectRoot: string,
  baseCommit: string,
): Promise<string[]> {
  const output = await executeReviewGit(projectRoot, [
    REVIEW_STATE_GIT.DIFF,
    ...REVIEW_STATE_GIT_ARGUMENTS.DIFF_COMMITTED_PATHS,
    `${baseCommit}${REVIEW_STATE_GIT.RANGE_SEPARATOR}${REVIEW_STATE_GIT.HEAD}`,
    REVIEW_STATE_GIT.END_OF_OPTIONS,
  ]);

  return output.split(REVIEW_STATE_GIT.RECORD_SEPARATOR).filter(Boolean).sort();
}
