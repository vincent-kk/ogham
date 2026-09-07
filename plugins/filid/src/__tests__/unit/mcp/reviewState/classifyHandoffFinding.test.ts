import { describe, expect, it } from 'vitest';

import { RULE_SCOPES } from '../../../../constants/ruleScopes.js';
import { classifyHandoffFinding } from '../../../../mcp/tools/reviewState/scope/classifyHandoffFinding.js';
import type { ReviewScopeViolation } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/** Baseline finding varied by each classification contract case. */
const BASE_VIOLATION: ReviewScopeViolation = {
  source: 'structure',
  severity: 'warning',
  path: 'src/example.ts',
  ruleId: 'unknown-rule',
  message: 'Review the changed path.',
  certainty: 'exact',
};

/**
 * Build one classification input without hiding the field varied by a test.
 * @param overrides Finding fields selected by the current contract case.
 * @returns Complete normalized changed-scope violation.
 */
function violation(
  overrides: Partial<ReviewScopeViolation>,
): ReviewScopeViolation {
  return { ...BASE_VIOLATION, ...overrides };
}

describe('classifyHandoffFinding', () => {
  it.each(['indeterminate', 'unsupported'] as const)(
    'classifies explicit %s certainty before the rule table',
    (certainty) => {
      expect(
        classifyHandoffFinding(
          violation({ certainty, ruleId: 'circular-dependency' }),
          RULE_SCOPES.DAG,
          [],
        ),
      ).toEqual({ class: 'indeterminate', notePrefix: '' });
    },
  );

  it('classifies an unstated certainty whose message says indeterminate', () => {
    expect(
      classifyHandoffFinding(
        violation({
          certainty: undefined,
          message: 'Evidence is indeterminate.',
        }),
        RULE_SCOPES.VERIFICATION,
        [],
      ),
    ).toEqual({ class: 'indeterminate', notePrefix: '' });
  });

  it('classifies a wildcard-generated stale path as a configuration decision', () => {
    expect(
      classifyHandoffFinding(
        violation({
          ruleId: 'stale-path',
          message:
            'Path token `packages/web/dist/index.js` in section "Structure" resolves to nothing from packages/web, its ancestors, or the project root — the reference has drifted or never existed.',
        }),
        RULE_SCOPES.DOCUMENTS,
        ['packages/*/dist'],
      ),
    ).toEqual({ class: 'config-decision', notePrefix: '' });
  });

  it('does not treat a short generated token as a substring match', () => {
    expect(
      classifyHandoffFinding(
        violation({
          ruleId: 'stale-path',
          message:
            'Path token `src/dist-utils/README.md` in section "Structure" resolves to nothing from src, its ancestors, or the project root — the reference has drifted or never existed.',
        }),
        RULE_SCOPES.DOCUMENTS,
        ['dist'],
      ),
    ).toEqual({ class: 'needs-rework', notePrefix: '' });
  });

  it('classifies a missing Boundary Exemption Reason as a configuration decision', () => {
    expect(
      classifyHandoffFinding(
        violation({
          ruleId: 'missing-field',
          message:
            'Boundary exemption "src/internal" has no reason; an exemption without one is an unmet contract, not a granted exemption.',
        }),
        RULE_SCOPES.DOCUMENTS,
        [],
      ),
    ).toEqual({ class: 'config-decision', notePrefix: '' });
  });

  it('does not treat unrelated Reason text as a configuration decision', () => {
    expect(
      classifyHandoffFinding(
        violation({ ruleId: 'missing-field', message: 'Reason is empty.' }),
        RULE_SCOPES.DOCUMENTS,
        [],
      ),
    ).toEqual({ class: 'needs-rework', notePrefix: '' });
  });

  it.each([
    ['circular-dependency', 'code-change'],
    ['external-import-boundary', 'code-change'],
    ['pure-function-isolation', 'code-change'],
    ['max-depth', 'code-change'],
    ['zero-peer-file', 'code-change'],
    ['module-entry-point', 'code-change'],
    ['entry-point-surface', 'code-change'],
    ['organ-no-intentmd', 'config-decision'],
  ] as const)(
    'maps %s to %s through the rule table',
    (ruleId, handoffClass) => {
      expect(
        classifyHandoffFinding(violation({ ruleId }), RULE_SCOPES.NODES, []),
      ).toEqual({ class: handoffClass, notePrefix: '' });
    },
  );

  it('defaults remaining document findings to rework', () => {
    expect(
      classifyHandoffFinding(
        violation({ ruleId: 'missing-section' }),
        RULE_SCOPES.DOCUMENTS,
        [],
      ),
    ).toEqual({ class: 'needs-rework', notePrefix: '' });
  });

  it('defaults remaining verification findings to code changes', () => {
    expect(
      classifyHandoffFinding(
        violation({ certainty: undefined, ruleId: 'custom-verification' }),
        RULE_SCOPES.VERIFICATION,
        [],
      ),
    ).toEqual({ class: 'code-change', notePrefix: '' });
  });

  it('marks every other unknown rule as an unclassified code change', () => {
    expect(
      classifyHandoffFinding(
        violation({ ruleId: 'custom-boundary' }),
        RULE_SCOPES.BOUNDARIES,
        [],
      ),
    ).toEqual({ class: 'code-change', notePrefix: 'unclassified: ' });
  });
});
