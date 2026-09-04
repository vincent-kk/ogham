import type { RenderVerifyBriefInput } from '../../../../../mcp/tools/reviewState/brief/reviewBriefTypes.js';

import { buildReviewBriefInput } from './buildReviewBriefInput.js';

/**
 * Build a verifier-brief fixture with reviewer and FCA decision targets.
 * @returns Complete deterministic verifier-brief input.
 */
export function buildVerifyBriefInput(): RenderVerifyBriefInput {
  const review = buildReviewBriefInput();
  return {
    group: review.group,
    files: review.files,
    sourceHash: review.sourceHash,
    candidates: review.candidates,
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
      },
    ],
  };
}
