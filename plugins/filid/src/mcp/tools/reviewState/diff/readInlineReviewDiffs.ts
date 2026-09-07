import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import { REVIEW_BRIEF_INLINE_DIFF_LIMIT } from '../../../../constants/reviewState.js';
import { resolveReviewArtifactPath } from '../state/resolveReviewArtifactPath.js';
import type { ReviewGroup } from '../state/reviewGroupTypes.js';
import type { ReviewStatePaths } from '../state/reviewStateTypes.js';

import type { RenderedReviewUnit } from './reviewUnitDiffTypes.js';

/**
 * Read materialized group diffs within the shared brief inline budget.
 * @param paths Contained artifact paths bounding every unit's diff.
 * @param group Prepared assignment whose diffs have already been materialized.
 * @returns Ordered diff bytes, or null when the total exceeds the byte limit.
 * @throws When a required diff is missing or a path violates containment.
 */
export function readInlineReviewDiffs(
  paths: ReviewStatePaths,
  group: ReviewGroup,
): RenderedReviewUnit[] | null {
  const diffs: RenderedReviewUnit[] = [];
  let bytes = 0;
  for (const unit of group.units) {
    const diffText = readUtf8FileIfExistsSync(
      resolveReviewArtifactPath(paths, unit.diffPath),
    );
    if (diffText === null)
      throw new Error(`Review unit diff is missing: ${unit.diffPath}`);
    bytes += Buffer.byteLength(diffText, 'utf8');
    if (bytes > REVIEW_BRIEF_INLINE_DIFF_LIMIT) return null;
    diffs.push({ unit, diffText });
  }
  return diffs;
}
