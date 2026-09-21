import type { ReviewRenderInput } from './reviewRenderTypes.js';
import { escapeReviewBlockerText } from './utils/escapeReviewBlockerText.js';
import { renderCodeSpan } from './utils/renderCodeSpan.js';

/**
 * Render canonical fix requests for confirmed findings only.
 *
 * @param input Prepared identity and deterministic verdict fold.
 * @returns Fix-request Markdown, or null outside REQUEST_CHANGES.
 */
export function renderFixRequests(input: ReviewRenderInput): string | null {
  if (input.fold.verdict !== 'REQUEST_CHANGES') return null;
  const requests = input.fold.confirmed.map((finding, index) => {
    const fixId = `FIX-${String(index + 1).padStart(3, '0')}`;
    const recommendedAction =
      finding.recommendedAction === null
        ? `Resolve the confirmed ${escapeReviewBlockerText(finding.rule)} violation at ${renderCodeSpan(finding.path)}.`
        : escapeReviewBlockerText(finding.recommendedAction);
    return [
      `## ${fixId}: ${escapeReviewBlockerText(finding.rule)} at ${renderCodeSpan(finding.path)}`,
      '',
      `- **Severity**: ${finding.severity}`,
      `- **Category**: ${finding.category}`,
      `- **Path**: ${renderCodeSpan(finding.path)}`,
      `- **Rule**: ${escapeReviewBlockerText(finding.rule)}`,
      `- **Claim**: ${escapeReviewBlockerText(finding.message)}`,
      `- **Evidence**: ${escapeReviewBlockerText(finding.findingEvidence ?? finding.decisionEvidence)}`,
      `- **Consequence**: ${escapeReviewBlockerText(finding.consequence ?? finding.decisionReason)}`,
      `- **Recommended Action**: ${recommendedAction}`,
    ].join('\n');
  });
  return [
    `# Fix Requests — ${escapeReviewBlockerText(input.branchName)}`,
    '',
    ...requests.flatMap((request) => [request, '']),
  ].join('\n');
}
