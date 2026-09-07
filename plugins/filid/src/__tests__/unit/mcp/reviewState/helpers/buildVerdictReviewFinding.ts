import type { ReviewFinding } from '../../../../../mcp/tools/reviewState/opinion/reviewOpinionTypes.js';

/**
 * Build a located claim on the verdict fixture's source path.
 * @param overrides Fields distinguishing one coverage or assignment scenario.
 * @returns Complete reviewer finding without mutating the supplied overrides.
 */
export function buildVerdictReviewFinding(
  overrides: Partial<ReviewFinding> = {},
): ReviewFinding {
  return {
    id: 'R01-001',
    severity: 'error',
    category: 'bug',
    path: 'src/a.ts',
    existingCode: 'return stale;',
    lines: '7-7',
    inDiff: true,
    rule: 'DEF-1',
    message: 'The stale value is returned.',
    evidence: 'src/a.ts:7',
    consequence: 'The caller receives stale data.',
    recommendedAction: 'Return the current value.',
    ...overrides,
  };
}
