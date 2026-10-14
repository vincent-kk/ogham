import { describe, expect, it } from 'vitest';

import { countRetainedViolations } from '../../../../mcp/tools/reviewState/scope/countRetainedViolations.js';
import type { ReviewScopeViolation } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

const violation = (
  source: ReviewScopeViolation['source'],
  severity: ReviewScopeViolation['severity'],
): ReviewScopeViolation => ({
  source,
  severity,
  path: 'src/a.ts',
  ruleId: 'external-import-boundary',
  message: `${source} ${severity}`,
});

describe('countRetainedViolations', () => {
  it('leaves info observations out of both axis counts', () => {
    expect(
      countRetainedViolations([
        violation('structure', 'info'),
        violation('verification', 'info'),
      ]),
    ).toEqual({ structure: 0, verification: 0 });
  });

  it('counts error and warning findings per axis', () => {
    expect(
      countRetainedViolations([
        violation('structure', 'error'),
        violation('structure', 'warning'),
        violation('structure', 'info'),
        violation('verification', 'error'),
      ]),
    ).toEqual({ structure: 2, verification: 1 });
  });
});
