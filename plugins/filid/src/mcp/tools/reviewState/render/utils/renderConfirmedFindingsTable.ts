import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../../scope/utils/renderMarkdownTable.js';
import type { JoinedReviewDecision } from '../../verdict/reviewVerdictTypes.js';

/**
 * Render confirmed findings with independently resolved line locations.
 *
 * @param findings Confirmed joined decisions in deterministic order.
 * @returns Canonical findings table or `none` when no finding was confirmed.
 */
export function renderConfirmedFindingsTable(
  findings: readonly JoinedReviewDecision[],
): string {
  return renderMarkdownTable(
    ['ID', 'Severity', 'Category', 'Path', 'Rule', 'Consequence', 'Action'],
    findings.map((finding) => [
      escapeMarkdownCell(finding.id),
      finding.severity,
      finding.category,
      escapeMarkdownCell(`${finding.path}:${finding.lines}`),
      escapeMarkdownCell(finding.rule),
      escapeMarkdownCell(finding.consequence ?? ''),
      escapeMarkdownCell(finding.recommendedAction ?? ''),
    ]),
    true,
  );
}
