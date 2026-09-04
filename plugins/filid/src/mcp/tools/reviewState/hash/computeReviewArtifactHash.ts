import { createHash } from 'node:crypto';

import {
  REVIEW_STATE_HASH_ALGORITHM,
  REVIEW_STATE_HASH_ENCODING,
} from '../../../../constants/reviewState.js';

/**
 * Hash exact opinion bytes for validation and sealing handoffs.
 *
 * @param content Exact UTF-8 artifact content.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
export function computeReviewArtifactHash(content: string): string {
  return createHash(REVIEW_STATE_HASH_ALGORITHM)
    .update(content, 'utf8')
    .digest(REVIEW_STATE_HASH_ENCODING);
}
