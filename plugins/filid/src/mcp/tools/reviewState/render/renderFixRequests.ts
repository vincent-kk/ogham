import type { ReviewRenderInput } from './reviewRenderTypes.js';

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
      `## ${fixId}: ${finding.rule} at ${finding.path}`,
      '',
      `- **Severity**: ${finding.severity}`,
      `- **Category**: ${finding.category}`,
      `- **Path**: \`${finding.path}\``,
      `- **Rule**: ${finding.rule}`,
      `- **Claim**: ${finding.message}`,
      `- **Evidence**: ${finding.findingEvidence ?? finding.decisionEvidence}`,
      `- **Consequence**: ${finding.consequence ?? finding.decisionReason}`,
      `- **Recommended Action**: ${finding.recommendedAction ?? `Resolve the confirmed ${finding.rule} violation at ${finding.path}.`}`,
    ].join('\n');
  });
  return [
    `# Fix Requests — ${input.branchName}`,
    '',
    ...requests.flatMap((request) => [request, '']),
  ].join('\n');
}
