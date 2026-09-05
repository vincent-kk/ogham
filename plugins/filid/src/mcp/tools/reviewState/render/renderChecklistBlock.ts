import type { ReviewChecklistEntry } from '../verdict/reviewVerdictTypes.js';

import { renderCoverageTable } from './utils/renderCoverageTable.js';

/**
 * Replace the complete final session checklist while preserving prior content.
 *
 * @param sessionMarkdown Existing session frontmatter and Change Context.
 * @param checklist Deterministically folded final checklist rows.
 * @returns Session Markdown with one canonical final checklist block.
 * @throws When the canonical Review Checklist heading is absent.
 */
export function renderChecklistBlock(
  sessionMarkdown: string,
  checklist: readonly ReviewChecklistEntry[],
): string {
  const headings = [...sessionMarkdown.matchAll(/^## Review Checklist\s*$/gm)];
  const heading = headings.at(-1);
  if (!heading)
    throw new Error('Session must contain a ## Review Checklist heading.');
  const preserved = sessionMarkdown.slice(0, heading.index).trimEnd();
  return [
    preserved,
    '',
    '## Review Checklist',
    '',
    renderCoverageTable(checklist),
    '',
  ].join('\n');
}
