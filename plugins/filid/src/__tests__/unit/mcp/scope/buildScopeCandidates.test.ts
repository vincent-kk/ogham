import { describe, expect, it } from 'vitest';

import { RULE_SCOPES } from '../../../../constants/ruleScopes.js';
import { buildScopeCandidates } from '../../../../mcp/tools/reviewState/scope/buildScopeCandidates.js';
import type { ReviewScopeViolation } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

const RULE_SCOPE_BY_ID = new Map<string, string>([
  ['document-rule', RULE_SCOPES.DOCUMENTS],
  ['entry-rule', RULE_SCOPES.ENTRY_POINTS],
  ['node-rule', RULE_SCOPES.NODES],
  ['boundary-rule', RULE_SCOPES.BOUNDARIES],
  ['dag-rule', RULE_SCOPES.DAG],
  ['verification-rule', RULE_SCOPES.VERIFICATION],
]);

function violation(
  overrides: Partial<ReviewScopeViolation> = {},
): ReviewScopeViolation {
  return {
    source: 'structure',
    severity: 'warning',
    path: 'src/value.ts',
    ruleId: 'node-rule',
    message: 'finding',
    ...overrides,
  };
}

describe('buildScopeCandidates', () => {
  it('assigns FCA IDs after sorting by path, rule, and message', () => {
    const result = buildScopeCandidates(
      [
        violation({ path: 'z.ts', ruleId: 'node-rule', message: 'z' }),
        violation({ path: 'a.ts', ruleId: 'entry-rule', message: 'b' }),
        violation({ path: 'a.ts', ruleId: 'document-rule', message: 'a' }),
      ],
      RULE_SCOPE_BY_ID,
    );

    expect(
      result.candidates.map(({ id, path, rule }) => ({ id, path, rule })),
    ).toEqual([
      { id: 'FCA-001', path: 'a.ts', rule: 'document-rule' },
      { id: 'FCA-002', path: 'a.ts', rule: 'entry-rule' },
      { id: 'FCA-003', path: 'z.ts', rule: 'node-rule' },
    ]);
  });

  it('deduplicates path, rule, and message while preserving distinct messages', () => {
    const result = buildScopeCandidates(
      [
        violation({ message: 'same finding' }),
        violation({ severity: 'error', message: 'same finding' }),
        violation({ message: 'other finding' }),
      ],
      RULE_SCOPE_BY_ID,
    );

    expect(
      result.candidates.map(({ severity, message }) => ({ severity, message })),
    ).toEqual([
      { severity: 'warning', message: 'other finding' },
      { severity: 'error', message: 'same finding' },
    ]);
  });

  it.each([
    [RULE_SCOPES.DOCUMENTS, 'contract'],
    [RULE_SCOPES.NODES, 'structure'],
    [RULE_SCOPES.VERIFICATION, 'verification'],
  ] as const)('maps %s scope to %s category', (scope, category) => {
    const result = buildScopeCandidates(
      [violation({ ruleId: `${scope}-rule` })],
      new Map([[`${scope}-rule`, scope]]),
    );

    expect(result.candidates[0]?.category).toBe(category);
  });

  it('returns empty candidate and informational collections for no input', () => {
    expect(buildScopeCandidates([], RULE_SCOPE_BY_ID)).toEqual({
      candidates: [],
      informational: [],
    });
  });

  it('keeps info rows out of candidates and in informational evidence', () => {
    const result = buildScopeCandidates(
      [violation({ severity: 'info' })],
      RULE_SCOPE_BY_ID,
    );

    expect(result.candidates).toEqual([]);
    expect(result.informational).toEqual([
      expect.objectContaining({ severity: 'info', rule: 'node-rule' }),
    ]);
  });

  it('preserves optional structure certainty on candidates', () => {
    const withCertainty = {
      ...violation(),
      certainty: 'indeterminate' as const,
    };

    const result = buildScopeCandidates([withCertainty], RULE_SCOPE_BY_ID);

    expect(result.candidates[0]).toMatchObject({
      certainty: 'indeterminate',
    });
  });
});
