import { describe, expect, it } from 'vitest';

import { collectDependencyReferences } from '../../../core/projectSnapshot/evidence/collectDependencyReferences.js';
import type { AdapterResolution } from '../../../types/adapters.js';

function resolution(root: string, fail = false): AdapterResolution {
  const path = `${root}/src/a.ts`;
  const adapter = {
    extractDependencies: async () => {
      if (fail) throw new Error('Parser unavailable');
      return ['./moved.js', './moved.js', './other.js'].map((rawSpecifier) => ({
        sourceFile: path,
        rawSpecifier,
        resolvedPath: null,
        kind: 'static',
      }));
    },
  };
  return {
    adapters: [adapter],
    ownership: new Map([[path, { adapter }]]),
    diagnostics: [],
    claims: new Map(),
    unsupportedPaths: [],
  } as unknown as AdapterResolution;
}

describe('dependency diagnostic identity and impact', () => {
  it('shares a root-independent identity only for the same consumer and target', async () => {
    const first = await collectDependencyReferences(resolution('/one'), '/one');
    const second = await collectDependencyReferences(
      resolution('/two'),
      '/two',
    );
    expect(first.diagnostics[0]).toMatchObject({
      path: '/one/src/a.ts',
      specifier: './moved.js',
      affects: ['dependencies', 'boundaries'],
    });
    expect(first.diagnostics[0]?.causeId).toMatch(/^[a-f0-9]{64}$/);
    expect(first.diagnostics[0]?.causeId).toBe(first.diagnostics[1]?.causeId);
    expect(first.diagnostics[0]?.causeId).not.toBe(
      first.diagnostics[2]?.causeId,
    );
    expect(first.diagnostics.map(({ causeId }) => causeId)).toEqual(
      second.diagnostics.map(({ causeId }) => causeId),
    );
  });

  it('keeps extraction failures scoped to dependency and boundary analysis', async () => {
    const result = await collectDependencyReferences(
      resolution('/one', true),
      '/one',
    );
    expect(result.certainty).toBe('indeterminate');
    expect(result.diagnostics[0]).toMatchObject({
      code: 'dependency-analysis-failed',
      affects: ['dependencies', 'boundaries'],
      path: '/one/src/a.ts',
    });
    expect(result.diagnostics[0]?.causeId).toMatch(/^[a-f0-9]{64}$/);
  });
});
