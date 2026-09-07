import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';
import type { ReviewUnit } from '../../state/reviewGroupTypes.js';
import type { ReviewScopeFile } from '../../state/reviewStateTypes.js';

/**
 * Format the shared reviewer/verifier file row without losing chunk identity.
 * @param unit Assigned unit with ordered hunk ranges.
 * @param file Matching roster entry supplying role and owner.
 * @returns Columns matching the canonical brief file-table header.
 */
export function renderReviewUnitRow(
  unit: ReviewUnit,
  file: ReviewScopeFile,
): string[] {
  return [
    escapeMarkdownCell(unit.path),
    unit.change,
    file.role,
    escapeMarkdownCell(file.owner ?? ''),
    unit.chunk ? `${unit.chunk.index}/${unit.chunk.total}` : '',
    String(unit.churn),
    escapeMarkdownCell(unit.diffPath),
    unit.hunks.map((hunk) => `${hunk.newStart}-${hunk.newEnd}`).join(', '),
  ];
}
