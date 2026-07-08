/**
 * @file activationAccumulative.test.ts
 * @description QGA-SA(runAccumulativeActivation) 유닛 테스트 — 합산 누적, 차수 정규화,
 * lexical 게이트, LINK 가중치 하한, clamp, eviction, 결정성.
 */
import { describe, expect, it } from 'vitest';

import { runAccumulativeActivation } from '../../core/spreadingActivation/accumulativeActivation.js';
import { Layer } from '../../types/common.js';
import { toNodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

function makeNode(
  id: string,
  title = id,
  tags: string[] = [],
  layer = Layer.L2_DERIVED,
): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title,
    layer,
    tags,
    created: '2026-07-01',
    updated: '2026-07-01',
    mtime: 0,
    accessed_count: 0,
  };
}

function makeEdge(from: string, to: string, weight = 0.8): KnowledgeEdge {
  return { from: toNodeId(from), to: toNodeId(to), type: 'LINK', weight };
}

function makeGraph(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
): KnowledgeGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes: nodeMap,
    edges,
    builtAt: '2026-07-08T00:00:00Z',
    nodeCount: nodeMap.size,
    edgeCount: edges.length,
  };
}

function scoreOf(
  results: ReturnType<typeof runAccumulativeActivation>,
  id: string,
): number {
  return results.find((r) => r.nodeId === toNodeId(id))?.score ?? 0;
}

describe('runAccumulativeActivation', () => {
  it('시드에서 링크 이웃으로 활성화가 전파된다', () => {
    const graph = makeGraph(
      [makeNode('A'), makeNode('B')],
      [makeEdge('A', 'B')],
    );
    const results = runAccumulativeActivation(graph, [toNodeId('A')]);

    expect(scoreOf(results, 'A')).toBe(1);
    expect(scoreOf(results, 'B')).toBeGreaterThan(0);
    expect(results.find((r) => r.nodeId === toNodeId('B'))?.hops).toBe(1);
  });

  it('두 시드에서 수렴하는 노드가 단일 경로 노드보다 높은 점수를 받는다 (합산 누적)', () => {
    const graph = makeGraph(
      [makeNode('A'), makeNode('B'), makeNode('X'), makeNode('Y')],
      [makeEdge('A', 'X'), makeEdge('B', 'X'), makeEdge('A', 'Y')],
    );
    const results = runAccumulativeActivation(graph, [
      toNodeId('A'),
      toNodeId('B'),
    ]);

    // A의 아웃디그리(2) 때문에 Y는 절반 질량, X는 A(절반)+B(전체) 합류
    expect(scoreOf(results, 'X')).toBeGreaterThan(scoreOf(results, 'Y'));
  });

  it('활성화 값은 1.0을 넘지 않는다 (clamp)', () => {
    const seeds = ['S1', 'S2', 'S3', 'S4', 'S5'];
    const nodes = [...seeds.map((s) => makeNode(s)), makeNode('T')];
    const edges = seeds.map((s) => makeEdge(s, 'T', 1.0));
    const graph = makeGraph(nodes, edges);

    const results = runAccumulativeActivation(
      graph,
      seeds.map((s) => toNodeId(s)),
      { iterations: 5 },
    );
    for (const r of results) expect(r.score).toBeLessThanOrEqual(1);
  });

  it('아웃디그리가 큰 허브는 이웃당 기여가 자동 감쇠된다 (차수 정규화)', () => {
    const hubTargets = Array.from({ length: 10 }, (_, i) => makeNode(`h${i}`));
    const nodes = [makeNode('H'), makeNode('L'), makeNode('M'), ...hubTargets];
    const edges = [
      ...hubTargets.map((n) => makeEdge('H', n.path, 0.8)),
      makeEdge('L', 'M', 0.8),
    ];
    const graph = makeGraph(nodes, edges);

    const results = runAccumulativeActivation(graph, [
      toNodeId('H'),
      toNodeId('L'),
    ]);

    // 동일 가중치·레이어에서 저차수(L→M, deg 1)가 허브(H→h0, deg 10)보다 강하게 전파
    expect(scoreOf(results, 'M')).toBeGreaterThan(scoreOf(results, 'h0'));
  });

  it('쿼리 토큰과 겹치는 노드가 게이트 우대를 받고, 비중첩 노드도 하한으로 생존한다', () => {
    const graph = makeGraph(
      [
        makeNode('S'),
        makeNode('P', 'Apple Pie Recipe', ['apple']),
        makeNode('Q', 'Banana Bread', ['banana']),
      ],
      [makeEdge('S', 'P'), makeEdge('S', 'Q')],
    );
    const results = runAccumulativeActivation(graph, [toNodeId('S')], {
      queryTokens: ['apple'],
    });

    expect(scoreOf(results, 'P')).toBeGreaterThan(scoreOf(results, 'Q'));
    expect(scoreOf(results, 'Q')).toBeGreaterThan(0);
  });

  it('쿼리 토큰이 없으면 게이트가 비활성화되어 동등 구조는 동등 점수를 받는다', () => {
    const graph = makeGraph(
      [
        makeNode('S'),
        makeNode('P', 'Apple Pie Recipe', ['apple']),
        makeNode('Q', 'Banana Bread', ['banana']),
      ],
      [makeEdge('S', 'P'), makeEdge('S', 'Q')],
    );
    const results = runAccumulativeActivation(graph, [toNodeId('S')]);

    expect(scoreOf(results, 'P')).toBeCloseTo(scoreOf(results, 'Q'), 10);
  });

  it('가중치 0인 cross-folder LINK도 하한 덕분에 전파된다', () => {
    const graph = makeGraph(
      [makeNode('A'), makeNode('B')],
      [makeEdge('A', 'B', 0)],
    );
    const results = runAccumulativeActivation(graph, [toNodeId('A')]);

    expect(scoreOf(results, 'B')).toBeGreaterThan(0);
  });

  it('maxActiveNodes 상한을 지키고 시드는 보존한다', () => {
    const targets = Array.from({ length: 10 }, (_, i) => makeNode(`t${i}`));
    const graph = makeGraph(
      [makeNode('S'), ...targets],
      targets.map((n) => makeEdge('S', n.path, 1.0)),
    );
    const results = runAccumulativeActivation(graph, [toNodeId('S')], {
      maxActiveNodes: 4,
    });

    expect(results.length).toBeLessThanOrEqual(4);
    expect(results.some((r) => r.nodeId === toNodeId('S'))).toBe(true);
  });

  it('동일 입력에 대해 결정적 순서를 반환한다', () => {
    const nodes = Array.from({ length: 8 }, (_, i) => makeNode(`n${i}`));
    const edges = [
      makeEdge('n0', 'n1'),
      makeEdge('n0', 'n2'),
      makeEdge('n1', 'n3'),
      makeEdge('n2', 'n3'),
      makeEdge('n3', 'n4'),
    ];
    const graph = makeGraph(nodes, edges);

    const a = runAccumulativeActivation(graph, [toNodeId('n0')]);
    const b = runAccumulativeActivation(graph, [toNodeId('n0')]);
    expect(a.map((r) => `${r.nodeId}:${r.score}`)).toEqual(
      b.map((r) => `${r.nodeId}:${r.score}`),
    );
  });
});
