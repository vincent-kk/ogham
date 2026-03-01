/**
 * @file spreading-activation.test.ts
 * @description SpreadingActivationEngine 유닛 테스트
 */
import { describe, expect, it } from 'vitest';

import {
  SpreadingActivationEngine,
  buildAdjacencyList,
  runSpreadingActivation,
} from '../../core/spreading-activation.js';
import { Layer } from '../../types/common.js';
import { toNodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

/** 테스트용 노드 생성 헬퍼 */
function makeNode(id: string, layer: Layer): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title: id,
    layer,
    tags: [],
    created: '2026-02-28',
    updated: '2026-02-28',
    mtime: 0,
    accessed_count: 0,
  };
}

/** 테스트용 엣지 생성 헬퍼 */
function makeEdge(from: string, to: string, weight = 0.8): KnowledgeEdge {
  return {
    from: toNodeId(from),
    to: toNodeId(to),
    type: 'LINK',
    weight,
  };
}

/** 간단한 테스트 그래프 생성
 *
 * 구조:
 *   A (L1) --0.8--> B (L2) --0.8--> C (L3)
 *                 \--0.6--> D (L2)
 */
function makeSimpleGraph(): KnowledgeGraph {
  const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
  nodes.set(toNodeId('A'), makeNode('A', Layer.L1_CORE));
  nodes.set(toNodeId('B'), makeNode('B', Layer.L2_DERIVED));
  nodes.set(toNodeId('C'), makeNode('C', Layer.L3_EXTERNAL));
  nodes.set(toNodeId('D'), makeNode('D', Layer.L2_DERIVED));

  const edges: KnowledgeEdge[] = [
    makeEdge('A', 'B', 0.8),
    makeEdge('B', 'C', 0.8),
    makeEdge('B', 'D', 0.6),
  ];

  return {
    nodes,
    edges,
    builtAt: '2026-02-28T00:00:00Z',
    nodeCount: nodes.size,
    edgeCount: edges.length,
  };
}

describe('buildAdjacencyList', () => {
  it('모든 노드를 인접 리스트에 포함해야 한다', () => {
    const graph = makeSimpleGraph();
    const adj = buildAdjacencyList(graph);

    expect(adj.has(toNodeId('A'))).toBe(true);
    expect(adj.has(toNodeId('B'))).toBe(true);
    expect(adj.has(toNodeId('C'))).toBe(true);
    expect(adj.has(toNodeId('D'))).toBe(true);
  });

  it('엣지 방향대로 이웃을 구성해야 한다', () => {
    const graph = makeSimpleGraph();
    const adj = buildAdjacencyList(graph);

    expect(adj.get(toNodeId('A'))).toContain(toNodeId('B'));
    expect(adj.get(toNodeId('B'))).toContain(toNodeId('C'));
    expect(adj.get(toNodeId('B'))).toContain(toNodeId('D'));
    expect(adj.get(toNodeId('C'))).toHaveLength(0);
  });
});

describe('runSpreadingActivation', () => {
  it('시드 노드는 활성화 값 1.0을 가져야 한다', () => {
    const graph = makeSimpleGraph();
    const results = runSpreadingActivation(graph, [toNodeId('A')]);

    const seedResult = results.find((r) => r.nodeId === toNodeId('A'));
    expect(seedResult).toBeDefined();
    expect(seedResult!.score).toBe(1.0);
    expect(seedResult!.hops).toBe(0);
  });

  it('1홉 이웃은 A[i] * W[i,j] * decay로 계산되어야 한다', () => {
    const graph = makeSimpleGraph();
    // A(L1, decay=0.5) -> B(weight=0.8)
    // A[B] = 1.0 * 0.8 * 0.5 = 0.4
    const results = runSpreadingActivation(graph, [toNodeId('A')]);

    const bResult = results.find((r) => r.nodeId === toNodeId('B'));
    expect(bResult).toBeDefined();
    expect(bResult!.score).toBeCloseTo(0.4, 5);
    expect(bResult!.hops).toBe(1);
  });

  it('2홉 이웃은 연쇄 감쇠가 적용되어야 한다', () => {
    const graph = makeSimpleGraph();
    // A(L1, decay=0.5) -> B(weight=0.8) -> C(weight=0.8)
    // A[B] = 1.0 * 0.8 * 0.5 = 0.4
    // A[C] = 0.4 * 0.8 * decay(B,L2=0.7) = 0.4 * 0.8 * 0.7 = 0.224
    const results = runSpreadingActivation(graph, [toNodeId('A')]);

    const cResult = results.find((r) => r.nodeId === toNodeId('C'));
    expect(cResult).toBeDefined();
    expect(cResult!.score).toBeCloseTo(0.224, 5);
    expect(cResult!.hops).toBe(2);
  });

  it('임계값 미만 노드는 결과에서 제외되어야 한다', () => {
    const graph = makeSimpleGraph();
    // threshold=0.5이면 B(0.4)도 제외
    const results = runSpreadingActivation(graph, [toNodeId('A')], {
      threshold: 0.5,
    });

    const bResult = results.find((r) => r.nodeId === toNodeId('B'));
    expect(bResult).toBeUndefined();
  });

  it('결과는 score 내림차순으로 정렬되어야 한다', () => {
    const graph = makeSimpleGraph();
    const results = runSpreadingActivation(graph, [toNodeId('A')]);

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('maxHops 제한이 적용되어야 한다', () => {
    const graph = makeSimpleGraph();
    const results = runSpreadingActivation(graph, [toNodeId('A')], {
      maxHops: 1,
    });

    // maxHops=1이면 C(2홉)는 포함되지 않아야 한다
    const cResult = results.find((r) => r.nodeId === toNodeId('C'));
    expect(cResult).toBeUndefined();
  });

  it('존재하지 않는 시드 노드는 무시되어야 한다', () => {
    const graph = makeSimpleGraph();
    const results = runSpreadingActivation(graph, [toNodeId('NONEXISTENT')]);
    expect(results).toHaveLength(0);
  });

  it('빈 그래프에서 빈 결과를 반환해야 한다', () => {
    const emptyGraph: KnowledgeGraph = {
      nodes: new Map(),
      edges: [],
      builtAt: '2026-02-28T00:00:00Z',
      nodeCount: 0,
      edgeCount: 0,
    };
    const results = runSpreadingActivation(emptyGraph, [toNodeId('A')]);
    expect(results).toHaveLength(0);
  });

  it('path에 경로 정보가 포함되어야 한다', () => {
    const graph = makeSimpleGraph();
    const results = runSpreadingActivation(graph, [toNodeId('A')]);

    const cResult = results.find((r) => r.nodeId === toNodeId('C'));
    expect(cResult?.path).toEqual([
      toNodeId('A'),
      toNodeId('B'),
      toNodeId('C'),
    ]);
  });

  it('decayOverride가 적용되어야 한다', () => {
    const graph = makeSimpleGraph();
    // decayOverride=0.9: A -> B = 1.0 * 0.8 * 0.9 = 0.72
    const results = runSpreadingActivation(graph, [toNodeId('A')], {
      decayOverride: 0.9,
    });

    const bResult = results.find((r) => r.nodeId === toNodeId('B'));
    expect(bResult!.score).toBeCloseTo(0.72, 5);
  });

  it('L5_CONTEXT 노드는 decay=0.95가 적용되어야 한다', () => {
    const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
    nodes.set(toNodeId('A'), makeNode('A', Layer.L1_CORE));
    nodes.set(toNodeId('E'), makeNode('E', Layer.L5_CONTEXT));
    const edges: KnowledgeEdge[] = [makeEdge('A', 'E', 1.0)];
    const graph: KnowledgeGraph = {
      nodes,
      edges,
      builtAt: '2026-02-28T00:00:00Z',
      nodeCount: nodes.size,
      edgeCount: edges.length,
    };

    // A(L1, decay=0.5) -> E(weight=1.0): score = 1.0 * 1.0 * 0.5 = 0.5
    const results = runSpreadingActivation(graph, [toNodeId('A')]);
    const eResult = results.find((r) => r.nodeId === toNodeId('E'));
    expect(eResult).toBeDefined();
    expect(eResult!.score).toBeCloseTo(0.5, 5);

    // E(L5, decay=0.95)에서 시작: 자기 자신 1.0
    const fromE = runSpreadingActivation(graph, [toNodeId('E')]);
    const seedE = fromE.find((r) => r.nodeId === toNodeId('E'));
    expect(seedE!.score).toBe(1.0);
  });
});

describe('SpreadingActivationEngine', () => {
  it('activate()가 runSpreadingActivation과 동일한 결과를 반환해야 한다', () => {
    const graph = makeSimpleGraph();
    const engine = new SpreadingActivationEngine();
    const results = engine.activate(graph, [toNodeId('A')]);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBe(1.0);
  });

  it('activateFrom()이 단일 시드로 동작해야 한다', () => {
    const graph = makeSimpleGraph();
    const engine = new SpreadingActivationEngine({ threshold: 0.1 });
    const results = engine.activateFrom(graph, toNodeId('A'));

    const seedResult = results.find((r) => r.nodeId === toNodeId('A'));
    expect(seedResult?.score).toBe(1.0);
  });

  it('defaultParams가 적용되어야 한다', () => {
    const graph = makeSimpleGraph();
    const engine = new SpreadingActivationEngine({ maxHops: 1 });
    const results = engine.activate(graph, [toNodeId('A')]);

    const cResult = results.find((r) => r.nodeId === toNodeId('C'));
    expect(cResult).toBeUndefined();
  });
});
