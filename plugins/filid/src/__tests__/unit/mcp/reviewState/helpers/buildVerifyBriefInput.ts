import type { RenderVerifyBriefInput } from '../../../../../mcp/tools/reviewState/brief/reviewBriefTypes.js';

import { buildReviewBriefInput } from './buildReviewBriefInput.js';

/**
 * Build a verifier-brief fixture with assigned and deterministically refuted findings.
 * @returns Complete deterministic verifier-brief input.
 */
export function buildVerifyBriefInput(): RenderVerifyBriefInput {
  const review = buildReviewBriefInput();
  return {
    verifierMethod:
      '# Verifier\n\n## Re-verification Mode\n\nResume-only method.\n\n## Deliverable\n\nWrite independent decisions.\n',
    diffs: [],
    group: review.group,
    files: review.files,
    sourceHash: review.sourceHash,
    findings: [
      {
        id: 'R01-001',
        category: 'bug',
        severity: 'error',
        path: 'src/a.ts',
        lines: '5-5',
        inDiff: true,
        rule: 'DEF-1',
        message: 'The changed branch returns the rejected value.',
        evidence: 'src/a.ts:5',
        consequence: 'Valid input is rejected.',
        existingCode: 'return false;',
        recommendedAction: 'Return the accepted value.',
      },
      {
        id: 'R01-002',
        category: 'test',
        severity: 'warning',
        path: 'src/b.ts',
        lines: 'unknown',
        inDiff: false,
        rule: 'TST-1',
        message: 'The boundary case lacks verification.',
        evidence: 'No test reaches the boundary input.',
        consequence: 'A regression can pass unnoticed.',
        existingCode: 'if (value === limit) return;',
        recommendedAction: 'Cover the boundary.',
      },
    ],
  };
}
