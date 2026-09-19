import { describe, expect, it } from 'vitest';

import { findUnownedReferences } from '../../../core/analysis/dependencyGraph/index.js';
import type { DependencyReference } from '../../../types/adapters.js';

function reference(
  overrides: Partial<DependencyReference> = {},
): DependencyReference {
  return {
    sourceFile: '/project/vite.config.ts',
    rawSpecifier: './feature/index.ts',
    resolvedPath: '/project/feature/index.ts',
    kind: 'static',
    ...overrides,
  };
}

describe('findUnownedReferences', () => {
  it('reports a reference whose source file has no owning fractal', () => {
    const result = findUnownedReferences(['/project/feature'], [reference()]);
    expect(result).toEqual([
      { reference: reference(), unownedPath: '/project/vite.config.ts' },
    ]);
  });

  it('reports a reference whose resolved target has no owning fractal', () => {
    const ref = reference({
      sourceFile: '/project/feature/consumer.ts',
      resolvedPath: '/project/unowned.ts',
    });
    const result = findUnownedReferences(['/project/feature'], [ref]);
    expect(result).toEqual([
      { reference: ref, unownedPath: '/project/unowned.ts' },
    ]);
  });

  it('keeps a fully owned reference out of the result', () => {
    const ref = reference({
      sourceFile: '/project/feature/consumer.ts',
      resolvedPath: '/project/feature/target.ts',
    });
    expect(findUnownedReferences(['/project/feature'], [ref])).toEqual([]);
  });

  it('skips an indeterminate reference before judging ownership', () => {
    const ref = reference({ certainty: 'indeterminate' });
    expect(findUnownedReferences([], [ref])).toEqual([]);
  });

  it('skips an unresolved reference before judging ownership', () => {
    const ref = reference({ resolvedPath: null });
    expect(findUnownedReferences([], [ref])).toEqual([]);
  });

  it('exempts a reference made from a verification file', () => {
    const ref = reference();
    expect(
      findUnownedReferences([], [ref], {
        verificationPaths: ['/project/vite.config.ts'],
      }),
    ).toEqual([]);
  });
});
