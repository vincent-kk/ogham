import { describe, expect, it } from 'vitest';

import {
  buildDependencyGraph,
  findUnownedReferences,
} from '../../../core/analysis/dependencyGraph/index.js';
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
      projectRoot: '/project',
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
        { projectRoot: '/project', verificationPaths: [sourceFile] },
      );
      expect(graph.certainty).toBe('exact');
      expect(graph.edges).toEqual([]);
    },
  );

  it.each([['/project/a'], ['/project/b']])(
    'draws no edge and stays exact for a production reference with no owner in %s',
    (owner) => {
      const unowned = { ...reference, resolvedPath: '/project/b/entry.unit' };
      const graph = buildDependencyGraph([owner], [unowned], 'exact', {
        projectRoot: '/project',
      });
      expect(graph.edges).toEqual([]);
      expect(graph.unknownFiles).toEqual([]);
      // The owner-less end has no node, so the reference is reported by
      // findUnownedReferences instead of making the whole graph undecided.
      expect(graph.certainty).toBe('exact');
      expect(
        findUnownedReferences([owner], [unowned]).map(
          ({ unownedPath }) => unownedPath,
        ),
      ).toEqual([
        owner === '/project/a' ? '/project/b/entry.unit' : sourceFile,
      ]);
    },
  );

  it('keeps an adapter-uncertain production reference out of edges', () => {
    const graph = buildDependencyGraph(
      ['/project/a', '/project/b'],
      [
        {
          ...reference,
          resolvedPath: '/project/b/entry.unit',
          certainty: 'indeterminate',
        },
      ],
      'exact',
      { projectRoot: '/project' },
    );
    expect(graph.edges).toEqual([]);
    expect(graph.certainty).toBe('indeterminate');
  });

  it('lets an adapter-uncertain verification reference make the graph indeterminate', () => {
    const graph = buildDependencyGraph(
      ['/project/a', '/project/b'],
      [
        {
          ...reference,
          resolvedPath: '/project/b/entry.unit',
          certainty: 'indeterminate',
        },
      ],
      'exact',
      { projectRoot: '/project', verificationPaths: [sourceFile] },
    );
    expect(graph.edges).toEqual([]);
    expect(graph.certainty).toBe('indeterminate');
  });

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
        'exact',
        { projectRoot: '/project' },
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
        { projectRoot: '/project', verificationPaths: [sourceFile] },
      ).certainty,
    ).toBe('indeterminate');
  });

  it.each(['indeterminate', 'unsupported'] as const)(
    'preserves %s collector certainty after excluding verification',
    (certainty) => {
      expect(
        buildDependencyGraph(['/project/a'], [reference], certainty, {
          projectRoot: '/project',
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
      { projectRoot: '/project', ...options },
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
      buildDependencyGraph(nodes, [verification, backward], 'exact', {
        projectRoot: '/project',
        ...options,
      }).cycles,
    ).toEqual([]);
  });
});
