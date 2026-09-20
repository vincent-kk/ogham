import { describe, expect, it } from 'vitest';

import {
  buildDependencyGraph,
  findUnownedReferences,
} from '../../../core/analysis/dependencyGraph/index.js';
import type { DependencyReference } from '../../../types/adapters.js';

/** Root every fixture path sits under. */
const projectRoot = '/project';

/** Owners `a` and `b`; each fixture reference starts in `a` or `b`. */
const nodePaths = ['/project/a', '/project/b'];

/** An exact reference from `a` to `b` that must stay an edge whatever else is uncertain. */
const exactReference: DependencyReference = {
  sourceFile: '/project/a/use.ts',
  rawSpecifier: '../b/index.js',
  resolvedPath: '/project/b/index.ts',
  kind: 'static',
};

describe('the dependency graph attributes what it cannot confirm to files', () => {
  it.each([
    {
      label: 'an adapter-uncertain reference',
      reference: {
        sourceFile: '/project/b/note.tsx',
        rawSpecifier: './other.js',
        resolvedPath: '/project/b/other.ts',
        kind: 'static',
        certainty: 'indeterminate',
      },
      unknownFiles: [
        { path: 'b/note.tsx', causes: ['uncertain-local-dependency'] },
      ],
    },
    {
      label: 'an unresolved production reference',
      reference: {
        sourceFile: '/project/b/use.ts',
        rawSpecifier: './gone.js',
        resolvedPath: null,
        kind: 'static',
      },
      unknownFiles: [
        { path: 'b/use.ts', causes: ['unresolved-local-dependency'] },
      ],
    },
  ] as const)(
    'lists the source of $label and keeps the exact edge',
    ({ reference, unknownFiles }) => {
      const graph = buildDependencyGraph(
        nodePaths,
        [exactReference, reference],
        'exact',
        { projectRoot },
      );
      expect(graph.unknownFiles).toEqual(unknownFiles);
      expect(graph.certainty).toBe('indeterminate');
      expect(
        graph.edges.map(({ fromFractalPath, toFractalPath }) => [
          fromFractalPath,
          toFractalPath,
        ]),
      ).toEqual([['/project/a', '/project/b']]);
    },
  );

  it('reports a reference no owner holds without making its source unknown', () => {
    const unowned: DependencyReference = {
      sourceFile: '/project/b/use.ts',
      rawSpecifier: '../loose/x.js',
      resolvedPath: '/project/loose/x.ts',
      kind: 'static',
    };

    const graph = buildDependencyGraph(
      nodePaths,
      [exactReference, unowned],
      'exact',
      { projectRoot },
    );

    expect(graph.unknownFiles).toEqual([]);
    expect(graph.certainty).toBe('exact');
    expect(
      graph.edges.map(({ fromFractalPath, toFractalPath }) => [
        fromFractalPath,
        toFractalPath,
      ]),
    ).toEqual([['/project/a', '/project/b']]);
    expect(findUnownedReferences(nodePaths, [exactReference, unowned])).toEqual(
      [{ reference: unowned, unownedPath: '/project/loose/x.ts' }],
    );
  });

  it('derives exact certainty from an empty list', () => {
    const graph = buildDependencyGraph(nodePaths, [exactReference], 'exact', {
      projectRoot,
    });
    expect(graph.unknownFiles).toEqual([]);
    expect(graph.certainty).toBe('exact');
  });

  it('merges the causes of one file and the collector seeds, sorted by path', () => {
    const graph = buildDependencyGraph(
      nodePaths,
      [
        {
          sourceFile: '/project/b/use.ts',
          rawSpecifier: './gone.js',
          resolvedPath: null,
          kind: 'static',
        },
        {
          sourceFile: '/project/b/use.ts',
          rawSpecifier: './other.js',
          resolvedPath: '/project/b/other.ts',
          kind: 'static',
          certainty: 'indeterminate',
        },
      ],
      'exact',
      {
        projectRoot,
        unknownFiles: [
          { path: 'a/broken.ts', causes: ['dependency-analysis-failed'] },
          { path: 'b/use.ts', causes: ['ambiguous-adapter-claim'] },
        ],
      },
    );
    expect(graph.unknownFiles).toEqual([
      { path: 'a/broken.ts', causes: ['dependency-analysis-failed'] },
      {
        path: 'b/use.ts',
        causes: [
          'ambiguous-adapter-claim',
          'uncertain-local-dependency',
          'unresolved-local-dependency',
        ],
      },
    ]);
  });

  it('leaves an unresolved verification reference out of the list', () => {
    const graph = buildDependencyGraph(
      nodePaths,
      [
        {
          sourceFile: '/project/a/use.test.ts',
          rawSpecifier: './gone.js',
          resolvedPath: null,
          kind: 'static',
        },
      ],
      'exact',
      { projectRoot, verificationPaths: ['/project/a/use.test.ts'] },
    );
    expect(graph.unknownFiles).toEqual([]);
    expect(graph.certainty).toBe('exact');
  });

  it('stays unsupported when the collector had no adapter', () => {
    expect(
      buildDependencyGraph(nodePaths, [], 'unsupported', { projectRoot })
        .certainty,
    ).toBe('unsupported');
  });
});
