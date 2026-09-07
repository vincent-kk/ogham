import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../../scope/utils/renderMarkdownTable.js';
import type { ReviewChecklistEntry } from '../../verdict/reviewVerdictTypes.js';

/**
 * Separate completed review obligations from justified prepare-time exclusions.
 * @param checklist Complete immutable path-level coverage from the verdict fold.
 * @returns Coverage denominator and bounded representatives for every exclusion reason.
 */
export function renderCoverageSummary(
  checklist: readonly ReviewChecklistEntry[],
): string {
  const reviewed = checklist.filter(
    (entry) => entry.result === 'reviewed',
  ).length;
  const pending = checklist.filter(
    (entry) => entry.result === 'pending',
  ).length;
  const excluded = checklist.filter((entry) => entry.result === 'skipped');
  const reasons = new Map<string, string[]>();
  for (const entry of excluded)
    reasons.set(entry.reason, [
      ...(reasons.get(entry.reason) ?? []),
      entry.path,
    ]);
  const ratio =
    reviewed + pending === 0
      ? 'N/A (no reviewable files)'
      : `${reviewed} / ${reviewed + pending} reviewable files reviewed`;
  const rows = [...reasons]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reason, paths]) => {
      const sorted = [...paths].sort();
      const representatives = sorted
        .slice(0, 3)
        .map(escapeMarkdownCell)
        .join(', ');
      return [
        escapeMarkdownCell(reason),
        String(paths.length),
        `${representatives}${paths.length > 3 ? `; +${paths.length - 3} more` : ''}`,
      ];
    });
  return [
    `${ratio}; ${pending} pending; ${excluded.length} excluded; ${checklist.length} total`,
    '',
    '### Exclusions by reason',
    '',
    renderMarkdownTable(['Reason', 'Count', 'Representative paths'], rows),
  ].join('\n');
}
