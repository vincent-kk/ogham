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

function uncertainResolution(root: string): AdapterResolution {
  const path = `${root}/src/a.ts`;
  const adapter = {
    extractDependencies: async () => [
      {
        sourceFile: path,
        rawSpecifier: './hidden.js',
        resolvedPath: `${root}/src/hidden.ts`,
        kind: 'dynamic',
        certainty: 'indeterminate',
      },
    ],
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
  it('reports an adapter-uncertain reference as an uncertain-local-dependency diagnostic', async () => {
    const result = await collectDependencyReferences(
      uncertainResolution('/one'),
      '/one',
    );
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'uncertain-local-dependency',
        path: '/one/src/a.ts',
        specifier: './hidden.js',
        affects: ['dependencies', 'boundaries'],
        causeId: expect.stringMatching(/^[a-f0-9]{64}$/),
        nextAction: expect.stringContaining('line'),
      }),
    ]);
  });

  it('reports an unresolved reference with a nextAction naming what to fix', async () => {
    const result = await collectDependencyReferences(
      resolution('/one'),
      '/one',
    );
    expect(result.diagnostics[0]?.code).toBe('unresolved-local-dependency');
    expect(result.diagnostics[0]?.nextAction).toContain('specifier');
  });

  it('reports no active structure adapter as dependency-adapter-unavailable', async () => {
    const empty: AdapterResolution = {
      adapters: [],
      ownership: new Map(),
      diagnostics: [],
      claims: new Map(),
      unsupportedPaths: [],
    } as unknown as AdapterResolution;
    const result = await collectDependencyReferences(empty, '/one');
    expect(result.certainty).toBe('unsupported');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'dependency-adapter-unavailable' }),
    ]);
  });

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
