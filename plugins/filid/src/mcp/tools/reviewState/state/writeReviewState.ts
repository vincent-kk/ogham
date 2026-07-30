import { writeFileAtomicallySync } from '@ogham/cross-platform';

import {
  REVIEW_STATE_JSON_INDENT,
  REVIEW_STATE_JSON_TRAILING_NEWLINE,
} from '../../../../constants/reviewState.js';

import type { ReviewStateRecord } from './reviewStateTypes.js';

export function writeReviewState(
  statePath: string,
  state: ReviewStateRecord,
): void {
  writeFileAtomicallySync(
    statePath,
    `${JSON.stringify(state, null, REVIEW_STATE_JSON_INDENT)}${REVIEW_STATE_JSON_TRAILING_NEWLINE}`,
  );
}
