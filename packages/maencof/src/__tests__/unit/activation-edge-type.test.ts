/**
 * @file activation-edge-type.test.ts
 * @description SA 엣지 타입별 멀티플라이어 검증 테스트
 */
import { describe, expect, it } from 'vitest';

import {
  EDGE_TYPE_MULTIPLIER,
  runSpreadingActivation,
} from '../../core/spreading-activation/spreading-activation.js';
import { Layer, toNodeId } from '../../types/common.js';
import type {
  EdgeTypeMap,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

function makeNode(id: string, layer: Layer = Layer.L2_DERIVED): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title: id,
    layer,
    tags: [],
    created: '2026-03-08',
    updated: '2026-03-08',
    mtime: 0,
    accessed_count: 0,
  };
}

function makeGraph(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  opts?: { withTypeMap?: boolean },
): KnowledgeGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build edgeWeightMap
  const edgeWeightMap = new Map<
    ReturnType<typeof toNodeId>,
    Map<ReturnType<typeof toNodeId>, number>
  >();
  for (const edge of edges) {
    let inner = edgeWeightMap.get(edge.from);
    if (!inner) {
      inner = new Map();
      edgeWeightMap.set(edge.from, inner);
    }
    inner.set(edge.to, edge.weight);
  }

  // Build edgeTypeMap (optional)
  let edgeTypeMap: EdgeTypeMap | undefined;
  if (opts?.withTypeMap !== false) {
    edgeTypeMap = new Map();
    for (const edge of edges) {
      let inner = edgeTypeMap.get(edge.from);
      if (!inner) {
        inner = new Map();
        edgeTypeMap.set(edge.from, inner);
      }
      inner.set(edge.to, edge.type);
    }
  }

  // Build adjacencyList
  const adjacencyList = new Map<
    ReturnType<typeof toNodeId>,
    ReturnType<typeof toNodeId>[]
  >();
  for (const id of nodeMap.keys()) {
    adjacencyList.set(id, []);
  }
  for (const edge of edges) {
    adjacencyList.get(edge.from)?.push(edge.to);
  }

  return {
    nodes: nodeMap,
    edges,
    builtAt: new Date().toISOString(),
    nodeCount: nodeMap.size,
    edgeCount: edges.length,
    adjacencyList,
    edgeWeightMap,
    edgeTypeMap,
  };
}

describe('EDGE_TYPE_MULTIPLIER', () => {
  it('모든 EdgeType에 대한 멀티플라이어가 정의되어 있다', () => {
    expect(EDGE_TYPE_MULTIPLIER.LINK).toBe(1.0);
    expect(EDGE_TYPE_MULTIPLIER.PARENT_OF).toBe(0.8);
    expect(EDGE_TYPE_MULTIPLIER.CHILD_OF).toBe(0.8);
    expect(EDGE_TYPE_MULTIPLIER.SIBLING).toBe(0.5);
    expect(EDGE_TYPE_MULTIPLIER.RELATIONSHIP).toBe(0.7);
    expect(EDGE_TYPE_MULTIPLIER.CROSS_LAYER).toBe(0.6);
    expect(EDGE_TYPE_MULTIPLIER.DOMAIN).toBe(0.3);
  });
});

describe('SA edge-type weighting', () => {
  it('LINK 엣지는 전체 가중치를 전파한다 (multiplier 1.0)', () => {
    const a = makeNode('A', Layer.L2_DERIVED);
    const b = makeNode('B', Layer.L2_DERIVED);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([a, b], edges);
    const results = runSpreadingActivation(graph, [a.id], {
      decayOverride: 1.0,
    });
    const bResult = results.find((r) => r.nodeId === b.id);
    // score = 1.0 * 1.0 (weight) * 1.0 (LINK multiplier) * 1.0 (decay) = 1.0
    expect(bResult).toBeDefined();
    expect(bResult!.score).toBeCloseTo(1.0, 5);
  });

  it('DOMAIN 엣지는 감소된 가중치를 전파한다 (multiplier 0.3)', () => {
    const a = makeNode('A', Layer.L2_DERIVED);
    const b = makeNode('B', Layer.L2_DERIVED);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'DOMAIN', weight: 1.0 },
    ];
    const graph = makeGraph([a, b], edges);
    const results = runSpreadingActivation(graph, [a.id], {
      decayOverride: 1.0,
    });
    const bResult = results.find((r) => r.nodeId === b.id);
    // score = 1.0 * 1.0 (weight) * 0.3 (DOMAIN multiplier) * 1.0 (decay) = 0.3
    expect(bResult).toBeDefined();
    expect(bResult!.score).toBeCloseTo(0.3, 5);
  });

  it('SIBLING 엣지는 절반 가중치를 전파한다 (multiplier 0.5)', () => {
    const a = makeNode('A', Layer.L2_DERIVED);
    const b = makeNode('B', Layer.L2_DERIVED);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'SIBLING', weight: 1.0 },
    ];
    const graph = makeGraph([a, b], edges);
    const results = runSpreadingActivation(graph, [a.id], {
      decayOverride: 1.0,
    });
    const bResult = results.find((r) => r.nodeId === b.id);
    // score = 1.0 * 1.0 (weight) * 0.5 (SIBLING multiplier) * 1.0 (decay) = 0.5
    expect(bResult).toBeDefined();
    expect(bResult!.score).toBeCloseTo(0.5, 5);
  });

  it('edgeTypeMap이 없으면 edges 배열에서 타입을 조회한다', () => {
    const a = makeNode('A', Layer.L2_DERIVED);
    const b = makeNode('B', Layer.L2_DERIVED);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'DOMAIN', weight: 1.0 },
    ];
    const graph = makeGraph([a, b], edges, { withTypeMap: false });
    expect(graph.edgeTypeMap).toBeUndefined();

    const results = runSpreadingActivation(graph, [a.id], {
      decayOverride: 1.0,
    });
    const bResult = results.find((r) => r.nodeId === b.id);
    // fallback: edges.find() → DOMAIN → multiplier 0.3
    expect(bResult).toBeDefined();
    expect(bResult!.score).toBeCloseTo(0.3, 5);
  });

  it('동일 weight에서 LINK > SIBLING > DOMAIN 순으로 활성화가 높다', () => {
    const a = makeNode('A', Layer.L2_DERIVED);
    const bLink = makeNode('B-link', Layer.L2_DERIVED);
    const cSib = makeNode('C-sib', Layer.L2_DERIVED);
    const dDom = makeNode('D-dom', Layer.L2_DERIVED);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: bLink.id, type: 'LINK', weight: 0.8 },
      { from: a.id, to: cSib.id, type: 'SIBLING', weight: 0.8 },
      { from: a.id, to: dDom.id, type: 'DOMAIN', weight: 0.8 },
    ];
    const graph = makeGraph([a, bLink, cSib, dDom], edges);
    const results = runSpreadingActivation(graph, [a.id], {
      decayOverride: 1.0,
    });
    const scoreLink = results.find((r) => r.nodeId === bLink.id)?.score ?? 0;
    const scoreSib = results.find((r) => r.nodeId === cSib.id)?.score ?? 0;
    const scoreDom = results.find((r) => r.nodeId === dDom.id)?.score ?? 0;
    expect(scoreLink).toBeGreaterThan(scoreSib);
    expect(scoreSib).toBeGreaterThan(scoreDom);
  });
});
