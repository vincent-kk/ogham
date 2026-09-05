import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../../scope/utils/renderMarkdownTable.js';
import type { JoinedReviewDecision } from '../../verdict/reviewVerdictTypes.js';

/**
 * Render candidates the verifier independently refuted.
 *
 * @param candidates Refuted joined decisions in deterministic order.
 * @returns Canonical refutation table or `none` when no candidate was refuted.
 */
export function renderRefutedCandidatesTable(
  candidates: readonly JoinedReviewDecision[],
): string {
  return renderMarkdownTable(
    ['ID', 'Category', 'Refuting Evidence', 'Reason'],
    candidates.map((candidate) => [
      escapeMarkdownCell(candidate.id),
      candidate.category,
      escapeMarkdownCell(candidate.decisionEvidence),
      escapeMarkdownCell(candidate.decisionReason),
    ]),
    true,
  );
}
