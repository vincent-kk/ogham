import {
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { REVIEW_STATE_FILE_NAMES } from '../../../../../constants/reviewState.js';
import type { ReviewStateRecord } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/**
 * Read the state persisted by a validate or seal action.
 *
 * @param projectRoot - Absolute root of the temporary repository.
 * @param normalizedBranch - Canonical branch directory key from prepared state.
 * @returns Parsed state record written by the real lifecycle handler.
 * @throws When the expected state artifact does not exist.
 */
export function readPersistedReviewState(
  projectRoot: string,
  normalizedBranch: string,
): ReviewStateRecord {
  const path = resolveContainedPath(
    projectRoot,
    '.filid/review',
    normalizedBranch,
    REVIEW_STATE_FILE_NAMES.STATE,
  );
  const content = readUtf8FileIfExistsSync(path);
  if (content === null) throw new Error('review state artifact is missing');
  return JSON.parse(content) as ReviewStateRecord;
}
