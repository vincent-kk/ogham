import { computeReviewArtifactHash } from './computeReviewArtifactHash.js';

/**
 * Fingerprint the complete sorted dirty-path set without exposing every path.
 * @param paths Project-relative dirty paths after review-artifact exclusion.
 * @returns Versioned digest used for active-generation freshness checks.
 */
export function computeReviewDirtyPathsHash(paths: readonly string[]): string {
  return computeReviewArtifactHash(JSON.stringify([1, paths]));
}
