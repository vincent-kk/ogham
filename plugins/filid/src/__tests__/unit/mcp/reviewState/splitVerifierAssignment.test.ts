import { describe, expect, it } from 'vitest';

import type { ReviewFinding } from '../../../../mcp/tools/reviewState/opinion/reviewOpinionTypes.js';
import { splitVerifierAssignment } from '../../../../mcp/tools/reviewState/opinion/splitVerifierAssignment.js';

describe('splitVerifierAssignment', () => {
  it.each([
    { rule: 'DEF-1', inDiff: false, lines: '5-5', assigned: false },
    { rule: 'USR-contract', inDiff: false, lines: '5-5', assigned: true },
    { rule: 'FCA-1', inDiff: false, lines: '5-5', assigned: true },
    { rule: 'DEF-1', inDiff: false, lines: 'unknown', assigned: false },
    { rule: 'DEF-1', inDiff: true, lines: '5-5', assigned: true },
  ])('partitions $rule at $lines, inDiff=$inDiff', (row) => {
    const finding: ReviewFinding = {
      id: 'R01-001',
      severity: 'error',
      category: 'bug',
      path: 'src/a.ts',
      existingCode: 'return false;',
      rule: row.rule,
      inDiff: row.inDiff,
      lines: row.lines,
      message: 'Wrong value.',
      evidence: 'src/a.ts:5',
      consequence: 'Valid input fails.',
      recommendedAction: 'Return true.',
    };
    const findings = [finding];
    const result = splitVerifierAssignment(findings);
    expect(result.assigned).toEqual(row.assigned ? findings : []);
    expect(result.deterministicRefuted).toEqual(row.assigned ? [] : findings);
    expect(findings).toEqual([finding]);
  });
});
