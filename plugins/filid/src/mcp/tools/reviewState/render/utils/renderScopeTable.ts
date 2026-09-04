import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../../scope/utils/renderMarkdownTable.js';
import type { ReviewScopeFile } from '../../state/reviewStateTypes.js';

/**
 * Render the complete changed-path and owner scope table.
 *
 * @param files Prepared changed-file roster in canonical order.
 * @returns Canonical Markdown table or `none` for an empty roster.
 */
export function renderScopeTable(files: readonly ReviewScopeFile[]): string {
  return renderMarkdownTable(
    ['Path', 'Owner'],
    files.map((file) => [
      escapeMarkdownCell(file.path),
      escapeMarkdownCell(file.owner ?? 'unowned'),
    ]),
    true,
  );
}
