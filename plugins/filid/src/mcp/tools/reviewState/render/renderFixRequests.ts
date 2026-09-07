import type { ReviewRenderInput } from './reviewRenderTypes.js';
import { escapeReviewBlockerText } from './utils/escapeReviewBlockerText.js';

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
    return [
      `## ${fixId}: ${escapeReviewBlockerText(finding.rule)} at ${escapeReviewBlockerText(finding.path)}`,
      '',
      `- **Severity**: ${finding.severity}`,
      `- **Category**: ${finding.category}`,
      `- **Path**: ${escapeReviewBlockerText(finding.path)}`,
      `- **Rule**: ${escapeReviewBlockerText(finding.rule)}`,
      `- **Claim**: ${escapeReviewBlockerText(finding.message)}`,
      `- **Evidence**: ${escapeReviewBlockerText(finding.findingEvidence ?? finding.decisionEvidence)}`,
      `- **Consequence**: ${escapeReviewBlockerText(finding.consequence ?? finding.decisionReason)}`,
      `- **Recommended Action**: ${escapeReviewBlockerText(finding.recommendedAction ?? `Resolve the confirmed ${finding.rule} violation at ${finding.path}.`)}`,
    ].join('\n');
  });
  return [
    `# Fix Requests — ${escapeReviewBlockerText(input.branchName)}`,
    '',
    ...requests.flatMap((request) => [request, '']),
  ].join('\n');
}
