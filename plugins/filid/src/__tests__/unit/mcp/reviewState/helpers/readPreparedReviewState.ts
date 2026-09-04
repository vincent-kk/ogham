import { readReviewState } from '../../../../../mcp/tools/reviewState/state/readReviewState.js';
import type {
  ReviewPreparePayload,
  ReviewStateRecord,
} from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/**
 * Read the canonical state referenced by one exact prepare response.
 *
 * @param payload Successful fresh, resumable, or cached prepare payload.
 * @returns The deeply validated canonical v2 review-state record.
 * @throws When the referenced state is absent or belongs to another schema.
 */
export function readPreparedReviewState(
  payload: ReviewPreparePayload,
): ReviewStateRecord {
  const state = readReviewState(payload.data.statePath);
  if (state === null || 'kind' in state)
    throw new Error('prepare response did not reference a v2 review state');
  return state;
}
