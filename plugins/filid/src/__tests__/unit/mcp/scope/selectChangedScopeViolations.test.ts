import { describe, expect, it } from 'vitest';

import { selectChangedScopeViolations } from '../../../../mcp/tools/reviewState/scope/selectChangedScopeViolations.js';
import type {
  ReviewScopeFile,
  ReviewScopeViolation,
} from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

const FILES: ReviewScopeFile[] = [
  {
    path: 'src/feature/value.ts',
    change: 'M',
    role: 'source',
    owner: 'src/domain',
    insertions: 2,
    deletions: 1,
  },
];

function violation(path: string): ReviewScopeViolation {
  return {
    source: 'structure',
    severity: 'warning',
    path,
    ruleId: 'node-rule',
    message: path,
  };
}

describe('selectChangedScopeViolations', () => {
  it.each([
    ['src/feature/value.ts', true],
    ['src/feature', true],
    ['src/domain', true],
    ['src/unrelated/value.ts', false],
  ] as const)('classifies %s retained=%s', (path, retained) => {
    const result = selectChangedScopeViolations([violation(path)], FILES);

    expect(result.retained).toHaveLength(retained ? 1 : 0);
    expect(result.outOfScope).toHaveLength(retained ? 0 : 1);
  });

  it('matches a project-root violation only through owner equality', () => {
    const rootViolation = violation('.');
    const rootOwnedFile: ReviewScopeFile = {
      path: 'root-value.ts',
      change: 'M',
      role: 'source',
      owner: '.',
      insertions: 1,
      deletions: 0,
    };

    expect(
      selectChangedScopeViolations([rootViolation], [rootOwnedFile]),
    ).toEqual({
      retained: [rootViolation],
      outOfScope: [],
    });

    expect(selectChangedScopeViolations([rootViolation], FILES)).toEqual({
      retained: [],
      outOfScope: [rootViolation],
    });
  });
});
