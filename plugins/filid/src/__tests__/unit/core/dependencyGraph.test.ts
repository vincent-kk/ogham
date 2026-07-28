import { describe, expect, it } from 'vitest';

import {
  buildDAG,
  buildDependencyGraph,
  detectCycles,
  getDirectDependencies,
  topologicalSort,
} from '../../../core/analysis/dependencyGraph/index.js';
import type { DependencyReference } from '../../../types/adapters.js';
import type {
  DependencyEdge,
  DependencyGraph,
} from '../../../types/fractal.js';

describe('dependency-graph', () => {
  describe('buildDAG', () => {
    it('should build a DAG from edges', () => {
      const edges: DependencyEdge[] = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'B', to: 'C', type: 'import' },
      ];
      const dag = buildDAG(edges);
      expect(dag.nodes.size).toBe(3);
      expect(dag.nodes.has('A')).toBe(true);
      expect(dag.nodes.has('B')).toBe(true);
      expect(dag.nodes.has('C')).toBe(true);
      expect(dag.edges).toHaveLength(2);
    });

    it('should build adjacency list correctly', () => {
      const edges: DependencyEdge[] = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'A', to: 'C', type: 'call' },
        { from: 'B', to: 'C', type: 'import' },
      ];
      const dag = buildDAG(edges);
      expect(dag.adjacency.get('A')).toEqual(
        expect.arrayContaining(['B', 'C']),
      );
      expect(dag.adjacency.get('B')).toEqual(['C']);
      expect(dag.adjacency.get('C')).toEqual([]);
    });

    it('should handle empty edges', () => {
      const dag = buildDAG([]);
      expect(dag.nodes.size).toBe(0);
      expect(dag.edges).toHaveLength(0);
    });

    it('should deduplicate nodes from multiple edges', () => {
      const edges: DependencyEdge[] = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'A', to: 'B', type: 'call' },
      ];
      const dag = buildDAG(edges);
      // nodes are deduplicated: 2 edges between same pair → still 2 unique nodes
      expect(dag.nodes.size).toBe(2);
      // edges are preserved individually (different types)
      expect(dag.edges).toHaveLength(2);
      // adjacency list keeps one entry per edge (not per unique target),
      // deduplication is deferred to getDirectDependencies()
      expect(dag.adjacency.get('A')).toEqual(['B', 'B']);
      // getDirectDependencies deduplicates at query time
      expect(getDirectDependencies(dag, 'A')).toEqual(['B']);
    });
  });

  describe('topologicalSort', () => {
    it('should return nodes in topological order', () => {
      const edges: DependencyEdge[] = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'B', to: 'C', type: 'import' },
      ];
      const dag = buildDAG(edges);
      const sorted = topologicalSort(dag);
      expect(sorted).not.toBeNull();
      expect(sorted!.indexOf('A')).toBeLessThan(sorted!.indexOf('B'));
      expect(sorted!.indexOf('B')).toBeLessThan(sorted!.indexOf('C'));
    });

    it('should handle diamond dependency', () => {
      const edges: DependencyEdge[] = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'A', to: 'C', type: 'import' },
        { from: 'B', to: 'D', type: 'import' },
        { from: 'C', to: 'D', type: 'import' },
      ];
      const dag = buildDAG(edges);
      const sorted = topologicalSort(dag);
      expect(sorted).not.toBeNull();
      expect(sorted!.indexOf('A')).toBeLessThan(sorted!.indexOf('B'));
      expect(sorted!.indexOf('A')).toBeLessThan(sorted!.indexOf('C'));
      expect(sorted!.indexOf('B')).toBeLessThan(sorted!.indexOf('D'));
      expect(sorted!.indexOf('C')).toBeLessThan(sorted!.indexOf('D'));
    });

    it('should return empty array for empty DAG', () => {
      const dag = buildDAG([]);
      expect(topologicalSort(dag)).toEqual([]);
    });

    it('should return null when cycle exists', () => {
      const edges: DependencyEdge[] = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'B', to: 'A', type: 'import' },
      ];
      const dag = buildDAG(edges);
      expect(topologicalSort(dag)).toBeNull();
    });
  });

  describe('detectCycles', () => {
    it('should return empty array for acyclic graph', () => {
      const edges: DependencyEdge[] = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'B', to: 'C', type: 'import' },
      ];
      const dag = buildDAG(edges);
      expect(detectCycles(dag)).toHaveLength(0);
    });

    it('should detect a simple cycle', () => {
      const edges: DependencyEdge[] = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'B', to: 'A', type: 'import' },
      ];
      const dag = buildDAG(edges);
      const cycles = detectCycles(dag);
      expect(cycles.length).toBeGreaterThan(0);
      // Cycle should contain both A and B
      const flat = cycles.flat();
      expect(flat).toContain('A');
      expect(flat).toContain('B');
    });

    it('should detect cycle in larger graph', () => {
      const edges: DependencyEdge[] = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'B', to: 'C', type: 'import' },
        { from: 'C', to: 'A', type: 'import' },
      ];
      const dag = buildDAG(edges);
      const cycles = detectCycles(dag);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('returns an actual directed closed route rather than sorted component labels', () => {
      const dag = buildDAG([
        { from: 'A', to: 'C', type: 'import' },
        { from: 'C', to: 'B', type: 'import' },
        { from: 'B', to: 'A', type: 'import' },
      ]);

      expect(detectCycles(dag)).toEqual([['A', 'C', 'B', 'A']]);
    });

    it('does not treat Windows path aliases as a cycle', () => {
      const canonicalOwner = String.raw`C:\Project\feature`;
      const aliasOwner = 'c:/project/FEATURE';
      const graph: DependencyGraph = {
        nodePaths: [canonicalOwner, aliasOwner],
        edges: [
          {
            fromFractalPath: canonicalOwner,
            toFractalPath: aliasOwner,
            evidence: [],
          },
          {
            fromFractalPath: aliasOwner,
            toFractalPath: canonicalOwner,
            evidence: [],
          },
        ],
        cycles: [],
        certainty: 'exact',
      };

      expect(detectCycles(graph)).toEqual([]);
    });
  });

  describe('getDirectDependencies', () => {
    it('should return direct dependencies of a node', () => {
      const edges: DependencyEdge[] = [
        { from: 'A', to: 'B', type: 'import' },
        { from: 'A', to: 'C', type: 'call' },
        { from: 'B', to: 'C', type: 'import' },
      ];
      const dag = buildDAG(edges);
      const deps = getDirectDependencies(dag, 'A');
      expect(deps).toContain('B');
      expect(deps).toContain('C');
      expect(deps).toHaveLength(2);
    });

    it('should return empty array for node with no dependencies', () => {
      const edges: DependencyEdge[] = [{ from: 'A', to: 'B', type: 'import' }];
      const dag = buildDAG(edges);
      expect(getDirectDependencies(dag, 'B')).toHaveLength(0);
    });

    it('should return empty array for non-existent node', () => {
      const dag = buildDAG([]);
      expect(getDirectDependencies(dag, 'X')).toHaveLength(0);
    });
  });

  describe('buildDependencyGraph', () => {
    it('detects an actual owner cycle from adapter dependency evidence', () => {
      const references: DependencyReference[] = [
        {
          sourceFile: '/project/a/source.ts',
          rawSpecifier: '../b/entry.js',
          resolvedPath: '/project/b/entry.ts',
          kind: 'static',
        },
        {
          sourceFile: '/project/b/source.ts',
          rawSpecifier: '../a/entry.js',
          resolvedPath: '/project/a/entry.ts',
          kind: 'static',
        },
      ];

      const graph = buildDependencyGraph(
        ['/project/a', '/project/b'],
        references,
        'exact',
      );

      expect(graph.cycles).toHaveLength(1);
      expect(new Set(graph.cycles[0])).toEqual(
        new Set(['/project/a', '/project/b']),
      );
    });

    it('keeps an owned-organ reference as evidence without making it a cycle edge', () => {
      const references: DependencyReference[] = [
        {
          sourceFile: '/project/hooks/index.ts',
          rawSpecifier: './pre/pre.js',
          resolvedPath: '/project/hooks/pre/pre.ts',
          kind: 're-export',
        },
        {
          sourceFile: '/project/hooks/pre/pre.ts',
          rawSpecifier: '../shared/shared.js',
          resolvedPath: '/project/hooks/shared/shared.ts',
          kind: 'static',
        },
      ];

      const graph = buildDependencyGraph(
        ['/project/hooks', '/project/hooks/pre'],
        references,
        'exact',
        { organPaths: ['/project/hooks/shared'] },
      );

      expect(graph.cycles).toEqual([]);
      expect(graph.edges).toHaveLength(2);
    });

    it('still reports a cycle when a child imports the parent entry point', () => {
      const references: DependencyReference[] = [
        {
          sourceFile: '/project/hooks/index.ts',
          rawSpecifier: './pre/pre.js',
          resolvedPath: '/project/hooks/pre/pre.ts',
          kind: 're-export',
        },
        {
          sourceFile: '/project/hooks/pre/pre.ts',
          rawSpecifier: '../index.js',
          resolvedPath: '/project/hooks/index.ts',
          kind: 'static',
        },
      ];

      const graph = buildDependencyGraph(
        ['/project/hooks', '/project/hooks/pre'],
        references,
        'exact',
        { organPaths: ['/project/hooks/shared'] },
      );

      expect(graph.cycles).toHaveLength(1);
    });

    it('aggregates and sorts evidence for the same owner pair', () => {
      const references: DependencyReference[] = [
        {
          sourceFile: '/project/a/z-source.ts',
          rawSpecifier: '../b/z.js',
          resolvedPath: '/project/b/z.ts',
          kind: 'static',
        },
        {
          sourceFile: '/project/a/a-source.ts',
          rawSpecifier: '../b/a.js',
          resolvedPath: '/project/b/a.ts',
          kind: 're-export',
        },
      ];

      const graph = buildDependencyGraph(
        ['/project/b', '/project/a'],
        references,
        'exact',
      );

      expect(graph.edges).toEqual([
        {
          fromFractalPath: '/project/a',
          toFractalPath: '/project/b',
          evidence: [
            {
              sourceFile: '/project/a/a-source.ts',
              rawSpecifier: '../b/a.js',
              resolvedPath: '/project/b/a.ts',
            },
            {
              sourceFile: '/project/a/z-source.ts',
              rawSpecifier: '../b/z.js',
              resolvedPath: '/project/b/z.ts',
            },
          ],
        },
      ]);
    });

    it('preserves same-owner evidence without creating a self-cycle', () => {
      const references: DependencyReference[] = [
        {
          sourceFile: '/project/a/source.ts',
          rawSpecifier: './helper.js',
          resolvedPath: '/project/a/helper.ts',
          kind: 'static',
        },
      ];

      const graph = buildDependencyGraph(['/project/a'], references, 'exact');

      expect(graph.edges).toEqual([
        {
          fromFractalPath: '/project/a',
          toFractalPath: '/project/a',
          evidence: [
            {
              sourceFile: '/project/a/source.ts',
              rawSpecifier: './helper.js',
              resolvedPath: '/project/a/helper.ts',
            },
          ],
        },
      ]);
      expect(graph.cycles).toEqual([]);
    });

    it('marks the graph indeterminate when an internal dependency is unresolved', () => {
      const references: DependencyReference[] = [
        {
          sourceFile: '/project/a/source.ts',
          rawSpecifier: '../missing/entry.js',
          resolvedPath: null,
          kind: 'static',
        },
      ];

      const graph = buildDependencyGraph(['/project/a'], references, 'exact');

      expect(graph.certainty).toBe('indeterminate');
      expect(graph.cycles).toEqual([]);
    });

    it('resolves Windows owner paths independently of the host OS', () => {
      const references: DependencyReference[] = [
        {
          sourceFile: String.raw`C:\project\a\source.ts`,
          rawSpecifier: '../b/entry.js',
          resolvedPath: String.raw`C:\project\b\entry.ts`,
          kind: 'static',
        },
      ];

      const graph = buildDependencyGraph(
        [String.raw`C:\project\a`, String.raw`C:\project\b`],
        references,
        'exact',
      );

      expect(graph.edges).toEqual([
        expect.objectContaining({
          fromFractalPath: String.raw`C:\project\a`,
          toFractalPath: String.raw`C:\project\b`,
        }),
      ]);
      expect(graph.certainty).toBe('exact');
    });

    it('collapses Windows case and separator aliases to canonical owners', () => {
      const ownerA = String.raw`C:\Project\a`;
      const ownerB = String.raw`C:\Project\b`;
      const references: DependencyReference[] = [
        {
          sourceFile: 'c:/PROJECT/A/source.ts',
          rawSpecifier: '../b/entry.js',
          resolvedPath: String.raw`C:\project\B\entry.ts`,
          kind: 'static',
        },
        {
          sourceFile: String.raw`c:\project\b\source.ts`,
          rawSpecifier: '../a/entry.js',
          resolvedPath: 'C:/PROJECT/A/entry.ts',
          kind: 'static',
        },
      ];

      const graph = buildDependencyGraph(
        [ownerA, 'c:/project/A', ownerB, 'c:/PROJECT/B'],
        references,
        'exact',
      );

      expect(graph.nodePaths).toEqual([ownerA, ownerB]);
      expect(graph.edges).toEqual([
        expect.objectContaining({
          fromFractalPath: ownerA,
          toFractalPath: ownerB,
        }),
        expect.objectContaining({
          fromFractalPath: ownerB,
          toFractalPath: ownerA,
        }),
      ]);
      expect(graph.cycles).toEqual([[ownerA, ownerB, ownerA]]);
    });
  });
});
