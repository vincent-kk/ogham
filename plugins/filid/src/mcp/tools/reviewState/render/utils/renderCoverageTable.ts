import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../../scope/utils/renderMarkdownTable.js';
import type { ReviewChecklistEntry } from '../../verdict/reviewVerdictTypes.js';

/**
 * Render one final coverage row for every prepared roster path.
 *
 * @param checklist Deterministically folded checklist entries.
 * @returns Canonical coverage table or `none` when the roster is empty.
 */
export function renderCoverageTable(
  checklist: readonly ReviewChecklistEntry[],
): string {
  return renderMarkdownTable(
    ['Path', 'Change', 'Group', 'Result', 'Reason'],
    checklist.map((entry) => [
      escapeMarkdownCell(entry.path),
      entry.change,
      entry.groups.join(','),
      entry.result,
      escapeMarkdownCell(entry.reason),
    ]),
    true,
  );
}
