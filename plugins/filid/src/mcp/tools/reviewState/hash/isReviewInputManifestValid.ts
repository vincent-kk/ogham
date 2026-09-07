import type { ReviewInputManifest } from '../state/reviewIncrementalTypes.js';

import { computeReviewInputManifest } from './computeReviewInputManifest.js';

/**
 * Verify stored digest claims against their recorded semantic sections.
 * @param input Persisted manifest whose identity has not yet been trusted.
 * @returns Whether the current encoding reproduces both identity digests.
 */
export function isReviewInputManifestValid(
  input: ReviewInputManifest,
): boolean {
  try {
    const observed = computeReviewInputManifest(input);
    return (
      input.schemaVersion === 1 &&
      observed.groupKey === input.groupKey &&
      observed.preparedInputHash === input.preparedInputHash
    );
  } catch {
    return false;
  }
}
