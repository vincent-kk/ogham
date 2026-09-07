import type { ReviewReuseSummary } from '../state/reviewIncrementalTypes.js';
import type { ReviewChecklistEntry } from '../verdict/reviewVerdictTypes.js';

import { renderCoverageTable } from './utils/renderCoverageTable.js';
import { renderReviewReuseSummary } from './utils/renderReviewReuseSummary.js';

/** Canonical checklist headings; matchAll preserves independent repeated calls. */
const REVIEW_CHECKLIST_HEADING_PATTERN = /^## Review Checklist\s*$/gm;

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
  reuse?: ReviewReuseSummary,
): string {
  const headings = [
    ...sessionMarkdown.matchAll(REVIEW_CHECKLIST_HEADING_PATTERN),
  ];
  const heading = headings.at(-1);
  if (!heading)
    throw new Error('Session must contain a ## Review Checklist heading.');
  const preserved = sessionMarkdown.slice(0, heading.index).trimEnd();
  return [
    preserved,
    '',
    ...(reuse
      ? ['## Incremental Reuse', '', renderReviewReuseSummary(reuse), '']
      : []),
    '## Review Checklist',
    '',
    renderCoverageTable(checklist),
    '',
  ].join('\n');
}
