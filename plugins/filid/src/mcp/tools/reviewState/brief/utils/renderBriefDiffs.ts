import { REVIEW_BRIEF_INLINE_DIFF_LIMIT } from '../../../../../constants/reviewState.js';
import type { RenderedReviewUnit } from '../../diff/reviewUnitDiffTypes.js';

/**
 * Render bounded group diffs without limiting the surrounding actor brief.
 * @param diffs Ordered unit bytes, or null when the reader exceeded the budget.
 * @returns Path-labelled fenced diffs, none, or the external diff-path pointer.
 */
export function renderBriefDiffs(
  diffs: readonly RenderedReviewUnit[] | null,
): string {
  if (
    diffs === null ||
    diffs.reduce(
      (size, { diffText }) => size + Buffer.byteLength(diffText, 'utf8'),
      0,
    ) > REVIEW_BRIEF_INLINE_DIFF_LIMIT
  )
    return 'see Diff Path column';
  return (
    diffs
      .map(
        ({ unit, diffText }) =>
          `### ${unit.path}\n\n\`\`\`diff\n${diffText}\n\`\`\``,
      )
      .join('\n\n') || 'none'
  );
}
