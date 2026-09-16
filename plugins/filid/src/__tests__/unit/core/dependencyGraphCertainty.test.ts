import { describe, expect, it } from 'vitest';

import { buildDependencyGraph } from '../../../core/analysis/dependencyGraph/index.js';
import type { DependencyReference } from '../../../types/adapters.js';

const sourceFile = '/project/a/consumer.unit';
const reference: DependencyReference = {
  sourceFile,
  rawSpecifier: '../b/entry',
  resolvedPath: null,
  kind: 'static',
};

describe('DAG certainty excludes adapter-classified verification references', () => {
  it('keeps exact certainty for an unresolved verification reference', () => {
    const graph = buildDependencyGraph(['/project/a'], [reference], 'exact', {
      verificationPaths: [sourceFile],
    });
    expect(graph.certainty).toBe('exact');
    expect(graph.edges).toEqual([]);
    expect(graph.cycles).toEqual([]);
  });

  it.each([['/project/a'], ['/project/b']])(
    'keeps exact certainty when verification lacks an owner in %s',
    (owner) => {
      const graph = buildDependencyGraph(
        [owner],
        [{ ...reference, resolvedPath: '/project/b/entry.unit' }],
        'exact',
        { verificationPaths: [sourceFile] },
      );
      expect(graph.certainty).toBe('exact');
      expect(graph.edges).toEqual([]);
    },
  );

  it.each([['/project/a'], ['/project/b']])(
    'keeps production owner uncertainty in %s',
    (owner) => {
      expect(
        buildDependencyGraph(
          [owner],
          [{ ...reference, resolvedPath: '/project/b/entry.unit' }],
        ).certainty,
      ).toBe('indeterminate');
    },
  );

  it('does not grant an exemption based on a test filename alone', () => {
    expect(
      buildDependencyGraph(
        ['/project/a'],
        [
          {
            ...reference,
            sourceFile: '/project/a/consumer.test.ts',
          },
        ],
      ).certainty,
    ).toBe('indeterminate');
  });

  it('does not hide an unresolved production reference beside verification', () => {
    expect(
      buildDependencyGraph(
        ['/project/a'],
        [
          reference,
          {
            ...reference,
            sourceFile: '/project/a/production.unit',
          },
        ],
        'exact',
        { verificationPaths: [sourceFile] },
      ).certainty,
    ).toBe('indeterminate');
  });

  it.each(['indeterminate', 'unsupported'] as const)(
    'preserves %s collector certainty after excluding verification',
    (certainty) => {
      expect(
        buildDependencyGraph(['/project/a'], [reference], certainty, {
          verificationPaths: [sourceFile],
        }).certainty,
      ).toBe(certainty);
    },
  );

  it('preserves verification evidence and a production cycle on the same owner pair', () => {
    const verification = {
      ...reference,
      resolvedPath: '/project/b/entry.unit',
    };
    const forward = { ...verification, sourceFile: '/project/a/entry.unit' };
    const backward: DependencyReference = {
      sourceFile: '/project/b/entry.unit',
      rawSpecifier: '../a/entry',
      resolvedPath: '/project/a/entry.unit',
      kind: 'static',
    };
    const options = { verificationPaths: [sourceFile] };
    const nodes = ['/project/a', '/project/b'];
    const graph = buildDependencyGraph(
      nodes,
      [verification, forward, backward],
      'exact',
      options,
    );
    expect(graph.certainty).toBe('exact');
    expect(graph.cycles).toEqual([['/project/a', '/project/b', '/project/a']]);
    expect(graph.edges[0].evidence).toHaveLength(2);
    expect(graph.edges[0].evidence).toContainEqual({
      sourceFile,
      rawSpecifier: reference.rawSpecifier,
      resolvedPath: verification.resolvedPath,
    });
    expect(
      buildDependencyGraph(nodes, [verification, backward], 'exact', options)
        .cycles,
    ).toEqual([]);
  });
});
