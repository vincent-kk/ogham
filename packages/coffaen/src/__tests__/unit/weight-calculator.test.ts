/**
 * @file weight-calculator.test.ts
 * @description WeightCalculator 단위 테스트
 */
import { describe, expect, it } from 'vitest';

import {
  LAYER_DECAY_FACTORS,
  calculateWeights,
  computePageRank,
  getLayerDecay,
  normalizeWeights,
} from '../../core/weight-calculator.js';
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

describe('LAYER_DECAY_FACTORS', () => {
  it('Layer 1 감쇠 인자는 0.5이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L1_CORE]).toBe(0.5);
  });

  it('Layer 5 감쇠 인자는 0.95이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L5_CONTEXT]).toBe(0.95);
  });

  it('Layer 2 감쇠 인자는 0.7이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L2_DERIVED]).toBe(0.7);
  });

  it('Layer 3 감쇠 인자는 0.8이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L3_EXTERNAL]).toBe(0.8);
  });

  it('Layer 4 감쇠 인자는 0.9이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L4_ACTION]).toBe(0.9);
  });

  it('Layer 5 감쇠 인자는 0.95이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L5_CONTEXT]).toBe(0.95);
  });
});

describe('getLayerDecay', () => {
  it('각 Layer에 올바른 감쇠 인자를 반환한다', () => {
    expect(getLayerDecay(Layer.L1_CORE)).toBe(0.5);
    expect(getLayerDecay(Layer.L2_DERIVED)).toBe(0.7);
    expect(getLayerDecay(Layer.L3_EXTERNAL)).toBe(0.8);
    expect(getLayerDecay(Layer.L4_ACTION)).toBe(0.9);
    expect(getLayerDecay(Layer.L5_CONTEXT)).toBe(0.95);
  });
});

describe('calculateWeights', () => {
  it('빈 그래프에서 오류 없이 동작한다', () => {
    const graph = makeGraph([], []);
    expect(() => calculateWeights(graph)).not.toThrow();
  });

  it('모든 엣지에 가중치를 할당한다', () => {
    const a = makeNode('01_Core/a.md', Layer.L1_CORE);
    const b = makeNode('01_Core/b.md', Layer.L1_CORE);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'LINK', weight: 0 },
      { from: a.id, to: b.id, type: 'SIBLING', weight: 0 },
    ];
    const graph = makeGraph([a, b], edges);
    const { edges: weighted } = calculateWeights(graph);
    for (const edge of weighted) {
      expect(edge.weight).toBeGreaterThanOrEqual(0);
      expect(edge.weight).toBeLessThanOrEqual(1);
    }
  });

  it('SIBLING 엣지에 Wu-Palmer 가중치를 계산한다', () => {
    const a = makeNode('01_Core/a.md');
    const b = makeNode('01_Core/b.md');
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'SIBLING', weight: 0 },
    ];
    const graph = makeGraph([a, b], edges);
    const { edges: weighted } = calculateWeights(graph);
    // 동일 디렉토리 → 높은 유사도
    expect(weighted[0].weight).toBeGreaterThan(0);
  });

  it('PageRank를 반환한다', () => {
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const graph = makeGraph([a, b], []);
    const { pageranks } = calculateWeights(graph);
    expect(pageranks.size).toBe(2);
    for (const rank of pageranks.values()) {
      expect(rank).toBeGreaterThan(0);
    }
  });
});

describe('computePageRank', () => {
  it('빈 그래프에서 빈 맵을 반환한다', () => {
    const graph = makeGraph([], []);
    const ranks = computePageRank(graph);
    expect(ranks.size).toBe(0);
  });

  it('단일 노드의 PageRank는 1.0이다 (dangling node → 자기 자신에게 분배)', () => {
    const a = makeNode('a/a.md');
    const graph = makeGraph([a], []);
    const ranks = computePageRank(graph);
    // 단일 dangling 노드: rank = (1-d)/n + d*danglingSum/n = 0.15 + 0.85 = 1.0
    expect(ranks.get(a.id)).toBeCloseTo(1.0, 5);
  });

  it('인바운드 링크가 많은 노드가 낮은 인바운드 노드보다 높은 PageRank를 갖는다', () => {
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const c = makeNode('c/c.md');
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'LINK', weight: 1.0 },
      { from: b.id, to: c.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([a, b, c], edges);
    const ranks = computePageRank(graph);
    // c는 b로부터 인바운드, b는 a로부터 인바운드
    // PageRank: c > b > a (링크 체인에서 말단이 더 높음)
    const rankA = ranks.get(a.id) ?? 0;
    const rankB = ranks.get(b.id) ?? 0;
    const rankC = ranks.get(c.id) ?? 0;
    expect(rankC).toBeGreaterThan(rankA);
    expect(rankB).toBeGreaterThan(rankA);
  });

  it('인바운드 링크가 많은 노드가 높은 PageRank를 갖는다', () => {
    const hub = makeNode('hub/hub.md');
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const c = makeNode('c/c.md');
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: hub.id, type: 'LINK', weight: 1.0 },
      { from: b.id, to: hub.id, type: 'LINK', weight: 1.0 },
      { from: c.id, to: hub.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([hub, a, b, c], edges);
    const ranks = computePageRank(graph);
    const hubRank = ranks.get(hub.id) ?? 0;
    const aRank = ranks.get(a.id) ?? 0;
    expect(hubRank).toBeGreaterThan(aRank);
  });
});

describe('normalizeWeights', () => {
  it('빈 배열에서 빈 배열을 반환한다', () => {
    expect(normalizeWeights([])).toEqual([]);
  });

  it('모든 가중치가 0이면 변경하지 않는다', () => {
    const edges: KnowledgeEdge[] = [
      { from: toNodeId('a'), to: toNodeId('b'), type: 'LINK', weight: 0 },
    ];
    const result = normalizeWeights(edges);
    expect(result[0].weight).toBe(0);
  });

  it('정규화 후 최대 가중치는 1.0이다', () => {
    const edges: KnowledgeEdge[] = [
      { from: toNodeId('a'), to: toNodeId('b'), type: 'LINK', weight: 2.0 },
      { from: toNodeId('b'), to: toNodeId('c'), type: 'LINK', weight: 4.0 },
    ];
    const result = normalizeWeights(edges);
    const maxWeight = Math.max(...result.map((e) => e.weight));
    expect(maxWeight).toBeCloseTo(1.0, 10);
  });

  it('가중치 비율을 유지한다', () => {
    const edges: KnowledgeEdge[] = [
      { from: toNodeId('a'), to: toNodeId('b'), type: 'LINK', weight: 1.0 },
      { from: toNodeId('b'), to: toNodeId('c'), type: 'LINK', weight: 2.0 },
    ];
    const result = normalizeWeights(edges);
    expect(result[1].weight / result[0].weight).toBeCloseTo(2.0, 10);
  });
});

describe('computeRelationshipWeight (calculateWeights 통해 검증)', () => {
  function makePersonNode(path: string, intimacyLevel: number): KnowledgeNode {
    return {
      id: toNodeId(path),
      path,
      title: path,
      layer: Layer.L4_ACTION,
      tags: ['test'],
      created: '2026-01-01',
      updated: '2026-01-01',
      mtime: 0,
      accessed_count: 0,
      person: { relationship_type: 'friend', intimacy_level: intimacyLevel },
    } as KnowledgeNode;
  }

  it('intimacy_level 1 → weight 0.2', () => {
    const a = makePersonNode('04_Action/alice.md', 1);
    const b = makePersonNode('04_Action/bob.md', 1);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'RELATIONSHIP', weight: 0 },
    ];
    const graph = makeGraph([a, b], edges);
    const { edges: weighted } = calculateWeights(graph);
    const relEdge = weighted.find((e) => e.type === 'RELATIONSHIP');
    expect(relEdge?.weight).toBeCloseTo(0.2, 5);
  });

  it('intimacy_level 3 → weight 0.6', () => {
    const a = makePersonNode('04_Action/alice.md', 3);
    const b = makePersonNode('04_Action/bob.md', 3);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'RELATIONSHIP', weight: 0 },
    ];
    const graph = makeGraph([a, b], edges);
    const { edges: weighted } = calculateWeights(graph);
    const relEdge = weighted.find((e) => e.type === 'RELATIONSHIP');
    expect(relEdge?.weight).toBeCloseTo(0.6, 5);
  });

  it('intimacy_level 5 → weight 1.0', () => {
    const a = makePersonNode('04_Action/alice.md', 5);
    const b = makePersonNode('04_Action/bob.md', 5);
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'RELATIONSHIP', weight: 0 },
    ];
    const graph = makeGraph([a, b], edges);
    const { edges: weighted } = calculateWeights(graph);
    const relEdge = weighted.find((e) => e.type === 'RELATIONSHIP');
    expect(relEdge?.weight).toBeCloseTo(1.0, 5);
  });
});

describe('PageRank RELATIONSHIP 포함', () => {
  it('RELATIONSHIP 엣지가 PageRank out-degree에 포함된다', () => {
    const a = makeNode('a/a.md');
    const b = makeNode('b/b.md');
    const edges: KnowledgeEdge[] = [
      { from: a.id, to: b.id, type: 'RELATIONSHIP', weight: 1.0 },
    ];
    const graph = makeGraph([a, b], edges);
    const ranks = computePageRank(graph);
    // b는 a로부터 인바운드를 받으므로 PageRank가 a보다 높다
    const rankA = ranks.get(a.id) ?? 0;
    const rankB = ranks.get(b.id) ?? 0;
    expect(rankB).toBeGreaterThan(rankA);
  });
});
