/**
 * @file dag-converter.test.ts
 * @description DAGConverter 단위 테스트
 */
import { describe, expect, it } from 'vitest';

import {
  applyLayerDirectionality,
  convertToDAG,
} from '../../core/dag-converter.js';
import { Layer, toNodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

function makeNode(
  path: string,
  layer: Layer = Layer.L2_DERIVED,
): KnowledgeNode {
  return {
    id: toNodeId(path),
    path,
    title: path,
    layer,
    tags: ['test'],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
  };
}

function makeGraph(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
): KnowledgeGraph {
  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges,
    builtAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

describe('convertToDAG', () => {
  it('순환 없는 그래프는 변경하지 않는다', () => {
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const c = makeNode('c/c.md');
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'LINK', weight: 1.0 },
      { from: b.id, to: c.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([a, b, c], edges);
    const { weakenedEdges, cycleCount } = convertToDAG(graph);
    expect(cycleCount).toBe(0);
    expect(weakenedEdges).toHaveLength(0);
  });

  it('단순 순환 A→B→A를 탐지하고 순환 엣지를 약화한다', () => {
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'LINK', weight: 1.0 },
      { from: b.id, to: a.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([a, b], edges);
    const { weakenedEdges, cycleCount, graph: dag } = convertToDAG(graph);
    expect(cycleCount).toBeGreaterThan(0);
    expect(weakenedEdges).toHaveLength(cycleCount);
    // 약화된 엣지 가중치는 0.1
    for (const edge of dag.edges) {
      const isWeakened = weakenedEdges.some(
        (w) => w.from === edge.from && w.to === edge.to,
      );
      if (isWeakened) {
        expect(edge.weight).toBe(0.1);
      }
    }
  });

  it('3-노드 순환 A→B→C→A를 탐지한다', () => {
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const c = makeNode('c/c.md');
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'LINK', weight: 1.0 },
      { from: b.id, to: c.id, type: 'LINK', weight: 1.0 },
      { from: c.id, to: a.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([a, b, c], edges);
    const { cycleCount } = convertToDAG(graph);
    expect(cycleCount).toBeGreaterThan(0);
  });

  it('빈 그래프에서도 오류 없이 동작한다', () => {
    const graph = makeGraph([], []);
    expect(() => convertToDAG(graph)).not.toThrow();
  });

  it('순환 엣지 가중치가 원래 값보다 낮다', () => {
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'LINK', weight: 0.9 },
      { from: b.id, to: a.id, type: 'LINK', weight: 0.9 },
    ];
    const graph = makeGraph([a, b], edges);
    const { graph: dag, weakenedEdges } = convertToDAG(graph);
    expect(weakenedEdges.length).toBeGreaterThan(0);
    for (const edge of dag.edges) {
      const isWeakened = weakenedEdges.some(
        (w) => w.from === edge.from && w.to === edge.to,
      );
      if (isWeakened) {
        expect(edge.weight).toBeLessThan(0.9);
      }
    }
  });
});

describe('applyLayerDirectionality', () => {
  it('Layer 1 → Layer 2 아웃바운드 LINK 엣지를 약화한다', () => {
    const a = makeNode('a/a.md', Layer.L1_CORE);
    const b = makeNode('b/b.md', Layer.L2_DERIVED);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([a, b], edges);
    const result = applyLayerDirectionality(graph);
    const edge = result.edges[0];
    expect(edge.weight).toBe(0.1);
  });

  it('Layer 2 → Layer 1 LINK 엣지는 약화하지 않는다', () => {
    const a = makeNode('a/a.md', Layer.L2_DERIVED);
    const b = makeNode('b/b.md', Layer.L1_CORE);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([a, b], edges);
    const result = applyLayerDirectionality(graph);
    const edge = result.edges[0];
    expect(edge.weight).toBe(1.0);
  });

  it('LINK가 아닌 엣지는 변경하지 않는다', () => {
    const a = makeNode('a/a.md', Layer.L1_CORE);
    const b = makeNode('b/b.md', Layer.L2_DERIVED);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'PARENT_OF', weight: 1.0 },
    ];
    const graph = makeGraph([a, b], edges);
    const result = applyLayerDirectionality(graph);
    expect(result.edges[0].weight).toBe(1.0);
  });
});
