import {
  assertNoSymlinkDescendantsSync,
  withFileLockSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_JSON_INDENT,
  REVIEW_STATE_JSON_TRAILING_NEWLINE,
} from '../../../../constants/reviewState.js';

import { readReviewState } from './readReviewState.js';
import type { ReviewStateRecord } from './reviewStateTypes.js';

/**
 * Persist progress within the active generation under its publication lock.
 * @param statePath Canonical active branch state path.
 * @param state Updated progress belonging to the currently active generation.
 * @returns Nothing after the atomic state replacement.
 * @throws If a different generation became active or the lock cannot be acquired.
 */
export function writeReviewState(
  statePath: string,
  state: ReviewStateRecord,
): void {
  assertNoSymlinkDescendantsSync(state.projectRoot, statePath);
  assertNoSymlinkDescendantsSync(state.projectRoot, `${statePath}.lock`);
  const result = withFileLockSync(statePath, () => {
    const current = readReviewState(statePath);
    if (
      current &&
      !('kind' in current) &&
      current.generationId !== state.generationId
    )
      throw new Error('review generation changed before state write');
    writeFileAtomicallySync(
      statePath,
      `${JSON.stringify(state, null, REVIEW_STATE_JSON_INDENT)}${REVIEW_STATE_JSON_TRAILING_NEWLINE}`,
    );
  });
  if (!result.acquired) throw new Error('review state write lock timed out');
}
