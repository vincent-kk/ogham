import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../../scope/utils/renderMarkdownTable.js';
import type { JoinedReviewDecision } from '../../verdict/reviewVerdictTypes.js';

/**
 * Render every joined verifier decision without dropping indeterminate rows.
 *
 * @param decisions Joined reviewer and FCA decisions in deterministic order.
 * @returns Canonical verification table or `none` when no candidates exist.
 */
export function renderVerificationLogTable(
  decisions: readonly JoinedReviewDecision[],
): string {
  return renderMarkdownTable(
    ['Candidate', 'Category', 'Verdict', 'Evidence', 'Reason'],
    decisions.map((decision) => [
      escapeMarkdownCell(decision.id),
      decision.category,
      decision.verdict,
      escapeMarkdownCell(decision.decisionEvidence),
      escapeMarkdownCell(decision.decisionReason),
    ]),
    true,
  );
}
