/**
 * @file graphBuilderHydrate.test.ts
 * @description hydrateRuntimeMaps / rebuildEdgeDerivedMaps / adjacency dedup / (from,to) 충돌 결정성.
 */
import { describe, expect, it } from 'vitest';

import { EDGE_TYPE_MULTIPLIER } from '../../constants/spreadingActivation.js';
import {
  buildAdjacencyList,
  hydrateRuntimeMaps,
  rebuildEdgeDerivedMaps,
} from '../../core/graphBuilder/index.js';
import type { NodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

function node(id: string, title = id, tags: string[] = []): KnowledgeNode {
  return {
    id: id as NodeId,
    path: id,
    title,
    layer: 2,
    tags,
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
  } as KnowledgeNode;
}

function graphOf(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
): KnowledgeGraph {
  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges,
    builtAt: 't',
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

describe('hydrateRuntimeMaps', () => {
  it('attaches all four runtime lookup maps from nodes + edges', () => {
    const g = graphOf(
      [node('a.md', 'Alpha', ['x']), node('b.md', 'Beta')],
      [
        {
          from: 'a.md' as NodeId,
          to: 'b.md' as NodeId,
          type: 'LINK',
          weight: 0.5,
        },
      ],
    );
    hydrateRuntimeMaps(g);
    expect(g.adjacencyList?.get('a.md' as NodeId)).toEqual(['b.md']);
    expect(g.edgeWeightMap?.get('a.md' as NodeId)?.get('b.md' as NodeId)).toBe(
      0.5,
    );
    expect(g.edgeTypeMap?.get('a.md' as NodeId)?.get('b.md' as NodeId)).toBe(
      'LINK',
    );
    expect(g.invertedIndex?.get('alpha')?.has('a.md' as NodeId)).toBe(true);
  });

  it('prefers the higher-multiplier edge type on a (from,to) collision', () => {
    const g = graphOf(
      [node('a.md'), node('b.md')],
      [
        {
          from: 'a.md' as NodeId,
          to: 'b.md' as NodeId,
          type: 'SIBLING',
          weight: 0.75,
        },
        {
          from: 'a.md' as NodeId,
          to: 'b.md' as NodeId,
          type: 'LINK',
          weight: 0.9,
        },
      ],
    );
    hydrateRuntimeMaps(g);
    expect(EDGE_TYPE_MULTIPLIER.LINK).toBeGreaterThan(
      EDGE_TYPE_MULTIPLIER.SIBLING,
    );
    expect(g.edgeTypeMap?.get('a.md' as NodeId)?.get('b.md' as NodeId)).toBe(
      'LINK',
    );
    expect(g.edgeWeightMap?.get('a.md' as NodeId)?.get('b.md' as NodeId)).toBe(
      0.9,
    );
  });

  it('deduplicates adjacency neighbors for parallel edges', () => {
    const adj = buildAdjacencyList(
      new Map([
        ['a.md' as NodeId, node('a.md')],
        ['b.md' as NodeId, node('b.md')],
      ]),
      [
        {
          from: 'a.md' as NodeId,
          to: 'b.md' as NodeId,
          type: 'SIBLING',
          weight: 0.75,
        },
        {
          from: 'a.md' as NodeId,
          to: 'b.md' as NodeId,
          type: 'LINK',
          weight: 0.9,
        },
      ],
    );
    expect(adj.get('a.md' as NodeId)).toEqual(['b.md']);
  });
});

describe('rebuildEdgeDerivedMaps', () => {
  it('no-ops when no maps are attached (fallback contract preserved)', () => {
    const g = graphOf([node('a.md')], []);
    rebuildEdgeDerivedMaps(g);
    expect(g.adjacencyList).toBeUndefined();
    expect(g.edgeWeightMap).toBeUndefined();
    expect(g.edgeTypeMap).toBeUndefined();
  });

  it('rebuilds edge-derived maps from current edges, leaving invertedIndex untouched', () => {
    const g = graphOf(
      [node('a.md', 'Alpha'), node('b.md', 'Beta')],
      [
        {
          from: 'a.md' as NodeId,
          to: 'b.md' as NodeId,
          type: 'LINK',
          weight: 0.5,
        },
      ],
    );
    hydrateRuntimeMaps(g);
    const invRef = g.invertedIndex;
    g.edges = [];
    rebuildEdgeDerivedMaps(g);
    // LINK 항목은 사라지고, 동일 루트 디렉토리 멤버십에서 파생된 SIBLING 만 남는다
    expect(g.edgeTypeMap?.get('a.md' as NodeId)?.get('b.md' as NodeId)).toBe(
      'SIBLING',
    );
    expect(g.edgeWeightMap?.get('a.md' as NodeId)?.get('b.md' as NodeId)).toBe(
      0,
    );
    expect(g.adjacencyList?.get('a.md' as NodeId)).toEqual(['b.md']);
    expect(g.invertedIndex).toBe(invRef);
  });
});
