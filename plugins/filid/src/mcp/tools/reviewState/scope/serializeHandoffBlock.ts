import { REVIEW_HANDOFF_MARKER } from '../../../../constants/reviewState.js';

import type { ReviewHandoffSeed } from './reviewHandoffSeedSchema.js';

/**
 * Serialize one handoff seed inside a delimiter-safe HTML comment.
 * @param seed Schema-valid bounded handoff payload.
 * @returns Three-line block with compact one-line JSON and escaped angles.
 */
export function serializeHandoffBlock(seed: ReviewHandoffSeed): string {
  const json = JSON.stringify(seed)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e');
  return `<!-- ${REVIEW_HANDOFF_MARKER}\n${json}\n-->`;
}
