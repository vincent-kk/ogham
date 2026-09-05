import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../../scope/utils/renderMarkdownTable.js';
import type { ReviewUnresolvedEvidence } from '../../verdict/reviewVerdictTypes.js';

/**
 * Render unresolved evidence without promoting any row into a finding.
 *
 * @param unresolved Folded gaps, observations, decisions, and trust failures.
 * @returns Canonical unresolved table or `none` when no rows exist.
 */
export function renderUnresolvedEvidenceTable(
  unresolved: readonly ReviewUnresolvedEvidence[],
): string {
  return renderMarkdownTable(
    ['Source', 'Path', 'Rule', 'Detail', 'Affects Verdict'],
    unresolved.map((entry) => [
      escapeMarkdownCell(entry.source),
      escapeMarkdownCell(entry.path),
      escapeMarkdownCell(entry.rule),
      escapeMarkdownCell(entry.detail),
      entry.affectsVerdict ? 'yes' : 'no',
    ]),
    true,
  );
}
