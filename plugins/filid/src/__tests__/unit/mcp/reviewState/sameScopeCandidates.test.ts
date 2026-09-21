import { describe, expect, it } from 'vitest';

import { sameScopeCandidates } from '../../../../mcp/tools/reviewState/handlers/utils/sameScopeCandidates.js';
import type { ReviewScopeCandidate } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/**
 * One structure candidate of the fixture.
 * @param id Ordinal FCA id.
 * @param path Project-relative path the candidate names.
 * @param severity Candidate severity.
 * @returns Candidate row.
 */
function candidate(
  id: string,
  path: string,
  severity: ReviewScopeCandidate['severity'] = 'warning',
): ReviewScopeCandidate {
  return {
    id,
    source: 'structure',
    scope: 'documents',
    category: 'contract',
    severity,
    path,
    rule: 'intent-document-contract',
    message: `INTENT.md is required for fractal node ${path}.`,
  };
}

describe('scope candidate comparison across generations', () => {
  it('treats the same candidates under other ordinal ids as unchanged', () => {
    expect(
      sameScopeCandidates(
        [candidate('FCA-001', 'alpha'), candidate('FCA-002', 'beta')],
        [candidate('FCA-002', 'beta'), candidate('FCA-003', 'alpha')],
      ),
    ).toBe(true);
  });

  it('treats a candidate whose severity changed as changed', () => {
    expect(
      sameScopeCandidates(
        [candidate('FCA-001', 'alpha')],
        [candidate('FCA-001', 'alpha', 'error')],
      ),
    ).toBe(false);
  });

  it('treats a candidate that disappeared as changed', () => {
    expect(
      sameScopeCandidates(
        [candidate('FCA-001', 'alpha'), candidate('FCA-002', 'beta')],
        [candidate('FCA-001', 'beta')],
      ),
    ).toBe(false);
  });
});
