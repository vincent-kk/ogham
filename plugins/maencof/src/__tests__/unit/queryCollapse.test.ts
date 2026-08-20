/**
 * @file queryCollapse.test.ts
 * @description 클러스터 collapse (R4) — collapseClusters 의미론(max 승계·전역 대표 승계·
 * 필터 정합·mtime 폴백·tie-break)과 query() 통합(절단 전 collapse, subLayerFilter pre-filter).
 */
import { describe, expect, it } from 'vitest';

import { buildAdjacencyList } from '../../core/graphBuilder/index.js';
import { query } from '../../search/queryEngine/index.js';
import { collapseClusters } from '../../search/queryEngine/query/collapseClusters.js';
import { Layer, toNodeId } from '../../types/common.js';
import type { NodeId, SubLayer } from '../../types/common.js';
import type {
  ActivationResult,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

function makeNode(
  id: string,
  overrides?: Partial<KnowledgeNode>,
): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title: overrides?.title ?? id,
    layer: Layer.L4_ACTION,
    tags: ['t'],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
    ...overrides,
  };
}

function graphOf(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[] = [],
): KnowledgeGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgeWeightMap = new Map<NodeId, Map<NodeId, number>>();
  for (const edge of edges) {
    if (!edgeWeightMap.has(edge.from)) edgeWeightMap.set(edge.from, new Map());
    edgeWeightMap.get(edge.from)!.set(edge.to, edge.weight);
  }
  return {
    nodes: nodeMap,
    edges,
    adjacencyList: buildAdjacencyList(nodeMap, edges),
    edgeWeightMap,
    builtAt: '2026-08-20T00:00:00Z',
    nodeCount: nodeMap.size,
    edgeCount: edges.length,
  };
}

function activation(id: string, score: number, hops = 1): ActivationResult {
  return { nodeId: toNodeId(id), score, hops, path: [toNodeId(id)] };
}

const anyNode = (): boolean => true;

describe('collapseClusters', () => {
  it('그룹 점수는 활성 멤버 max 를 승계하고 updated 최신 멤버가 대표가 된다', () => {
    const graph = graphOf([
      makeNode('04_Action/t-01.md', {
        clusterKey: 'th',
        updated: '2026-02-01',
      }),
      makeNode('04_Action/t-02.md', {
        clusterKey: 'th',
        updated: '2026-02-05',
      }),
    ]);
    const results = [
      activation('04_Action/t-01.md', 0.9),
      activation('04_Action/t-02.md', 0.4),
    ];

    const collapsed = collapseClusters(results, graph, anyNode);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]!.nodeId).toBe(toNodeId('04_Action/t-02.md'));
    expect(collapsed[0]!.score).toBe(0.9);
    expect(collapsed[0]!.clusterKey).toBe('th');
    expect(collapsed[0]!.collapsedCount).toBe(1);
  });

  it('활성화되지 않은 전역 최신 멤버(증류본)가 대표를 승계한다', () => {
    const graph = graphOf([
      makeNode('04_Action/t-01.md', {
        clusterKey: 'th',
        updated: '2026-02-01',
      }),
      makeNode('04_Action/t-02.md', {
        clusterKey: 'th',
        updated: '2026-02-02',
      }),
      makeNode('04_Action/digest.md', {
        clusterKey: 'th',
        updated: '2026-02-09',
      }),
    ]);
    const results = [
      activation('04_Action/t-01.md', 0.8, 1),
      activation('04_Action/t-02.md', 0.6, 2),
    ];

    const collapsed = collapseClusters(results, graph, anyNode);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]!.nodeId).toBe(toNodeId('04_Action/digest.md'));
    expect(collapsed[0]!.score).toBe(0.8);
    expect(collapsed[0]!.hops).toBe(1);
    expect(collapsed[0]!.path).toEqual([]);
    expect(collapsed[0]!.collapsedCount).toBe(2);
  });

  it('활성 필터를 만족하지 않는 전역 멤버는 대표가 될 수 없다', () => {
    const graph = graphOf([
      makeNode('04_Action/t-01.md', {
        clusterKey: 'th',
        updated: '2026-02-01',
      }),
      makeNode('02_Derived/digest.md', {
        clusterKey: 'th',
        layer: Layer.L2_DERIVED,
        updated: '2026-02-09',
      }),
    ]);
    const onlyL4 = (node: KnowledgeNode): boolean =>
      node.layer === Layer.L4_ACTION;

    const collapsed = collapseClusters(
      [activation('04_Action/t-01.md', 0.7)],
      graph,
      onlyL4,
    );

    expect(collapsed[0]!.nodeId).toBe(toNodeId('04_Action/t-01.md'));
  });

  it('updated 가 비정규 형식이면 mtime 파생 날짜로 비교한다', () => {
    const graph = graphOf([
      makeNode('04_Action/t-01.md', {
        clusterKey: 'th',
        updated: '2026-02-05',
        mtime: 0,
      }),
      makeNode('04_Action/t-02.md', {
        clusterKey: 'th',
        updated: 'not-a-date',
        // 2026-03-01 이후의 mtime — 폴백 날짜가 t-01 의 updated 보다 늦다
        mtime: Date.UTC(2026, 2, 15),
      }),
    ]);

    const collapsed = collapseClusters(
      [
        activation('04_Action/t-01.md', 0.5),
        activation('04_Action/t-02.md', 0.4),
      ],
      graph,
      anyNode,
    );

    expect(collapsed[0]!.nodeId).toBe(toNodeId('04_Action/t-02.md'));
  });

  it('clusterKey 없는 결과는 그대로 통과한다', () => {
    const graph = graphOf([
      makeNode('02_Derived/a.md'),
      makeNode('02_Derived/b.md'),
    ]);
    const results = [
      activation('02_Derived/a.md', 0.9),
      activation('02_Derived/b.md', 0.5),
    ];

    const collapsed = collapseClusters(results, graph, anyNode);

    expect(collapsed.map((r) => String(r.nodeId))).toEqual([
      '02_Derived/a.md',
      '02_Derived/b.md',
    ]);
    expect(collapsed[0]!.clusterKey).toBeUndefined();
    expect(collapsed[0]!.collapsedCount).toBeUndefined();
  });

  it('멤버 1건 클러스터는 clusterKey 만 표기하고 collapsedCount 는 싣지 않는다', () => {
    const graph = graphOf([
      makeNode('04_Action/solo.md', { clusterKey: 'solo-th' }),
    ]);

    const collapsed = collapseClusters(
      [activation('04_Action/solo.md', 0.6)],
      graph,
      anyNode,
    );

    expect(collapsed[0]!.clusterKey).toBe('solo-th');
    expect(collapsed[0]!.collapsedCount).toBeUndefined();
  });

  it('updated 동률은 활성 멤버 우선 → nodeId 사전순으로 결정된다', () => {
    const graph = graphOf([
      makeNode('04_Action/tb.md', { clusterKey: 'th', updated: '2026-02-01' }),
      makeNode('04_Action/ta.md', { clusterKey: 'th', updated: '2026-02-01' }),
    ]);

    const collapsed = collapseClusters(
      [activation('04_Action/tb.md', 0.5), activation('04_Action/ta.md', 0.5)],
      graph,
      anyNode,
    );

    expect(collapsed[0]!.nodeId).toBe(toNodeId('04_Action/ta.md'));
  });

  it('지목 멤버는 updated 최신이 아니어도 대표가 된다', () => {
    const graph = graphOf([
      makeNode('04_Action/t-01.md', {
        clusterKey: 'th',
        updated: '2026-02-01',
      }),
      makeNode('04_Action/t-02.md', {
        clusterKey: 'th',
        updated: '2026-02-05',
      }),
    ]);
    const results = [
      activation('04_Action/t-01.md', 0.9),
      activation('04_Action/t-02.md', 0.4),
    ];

    const collapsed = collapseClusters(
      results,
      graph,
      anyNode,
      new Set([toNodeId('04_Action/t-01.md')]),
    );

    expect(collapsed[0]!.nodeId).toBe(toNodeId('04_Action/t-01.md'));
    expect(collapsed[0]!.score).toBe(0.9);
    expect(collapsed[0]!.collapsedCount).toBe(1);
  });

  it('지목 멤버가 둘이면 그중 updated 최신이 대표다', () => {
    const graph = graphOf([
      makeNode('04_Action/t-01.md', {
        clusterKey: 'th',
        updated: '2026-02-01',
      }),
      makeNode('04_Action/t-02.md', {
        clusterKey: 'th',
        updated: '2026-02-03',
      }),
      makeNode('04_Action/t-03.md', {
        clusterKey: 'th',
        updated: '2026-02-05',
      }),
    ]);
    const results = [
      activation('04_Action/t-01.md', 0.5),
      activation('04_Action/t-02.md', 0.5),
      activation('04_Action/t-03.md', 0.5),
    ];

    const collapsed = collapseClusters(
      results,
      graph,
      anyNode,
      new Set([toNodeId('04_Action/t-01.md'), toNodeId('04_Action/t-02.md')]),
    );

    expect(collapsed[0]!.nodeId).toBe(toNodeId('04_Action/t-02.md'));
  });

  it('지목 멤버가 활성 필터를 만족하지 않으면 대표가 될 수 없다', () => {
    const graph = graphOf([
      makeNode('04_Action/t-01.md', {
        clusterKey: 'th',
        updated: '2026-02-05',
      }),
      makeNode('02_Derived/d.md', {
        clusterKey: 'th',
        layer: Layer.L2_DERIVED,
        updated: '2026-02-01',
      }),
    ]);
    const onlyL4 = (node: KnowledgeNode): boolean =>
      node.layer === Layer.L4_ACTION;

    const collapsed = collapseClusters(
      [activation('04_Action/t-01.md', 0.7)],
      graph,
      onlyL4,
      new Set([toNodeId('02_Derived/d.md')]),
    );

    expect(collapsed[0]!.nodeId).toBe(toNodeId('04_Action/t-01.md'));
  });
});

describe('query() 통합 — collapse 는 절단 전, subLayerFilter 는 pre-filter', () => {
  it('클러스터 8건이 활성화되어도 maxResults 10 결과에 대표 1건만 남는다', () => {
    const seed = makeNode('02_Derived/seed.md', { layer: Layer.L2_DERIVED });
    const members = Array.from({ length: 8 }, (_, i) =>
      makeNode(`04_Action/th-${String(i).padStart(2, '0')}.md`, {
        clusterKey: 'jira-th',
        updated: `2026-02-0${Math.min(i + 1, 8)}`,
      }),
    );
    const decision = makeNode('02_Derived/decision.md', {
      layer: Layer.L2_DERIVED,
      updated: '2026-02-10',
    });
    const edges: KnowledgeEdge[] = [...members, decision].map((n) => ({
      from: seed.id,
      to: n.id,
      type: 'LINK' as const,
      weight: 1,
    }));
    const graph = graphOf([seed, ...members, decision], edges);

    const result = query(graph, ['02_Derived/seed.md'], { maxResults: 10 });

    const clusterItems = result.results.filter(
      (r) => r.clusterKey === 'jira-th',
    );
    expect(clusterItems).toHaveLength(1);
    expect(clusterItems[0]!.nodeId).toBe(toNodeId('04_Action/th-07.md'));
    expect(clusterItems[0]!.collapsedCount).toBe(7);
    expect(
      result.results.some((r) => String(r.nodeId) === '02_Derived/decision.md'),
    ).toBe(true);
  });

  it('subLayerFilter 는 절단 전에 적용되어 maxResults 를 채운다', () => {
    // 공유 태그 'sigma' 키워드 시드 — 15개 노드 전부가 tag-exact 시드로 채택되어
    // 결과에 남는다. pre-filter 라면 topical 12개 중 10개가 결과를 채운다.
    const topical = Array.from({ length: 12 }, (_, i) =>
      makeNode(`03_External/topical/t-${String(i).padStart(2, '0')}.md`, {
        layer: Layer.L3_EXTERNAL,
        subLayer: 'topical' as SubLayer,
        tags: ['sigma'],
      }),
    );
    const relational = Array.from({ length: 3 }, (_, i) =>
      makeNode(`03_External/relational/r-${i}.md`, {
        layer: Layer.L3_EXTERNAL,
        subLayer: 'relational' as SubLayer,
        tags: ['sigma'],
      }),
    );
    const graph = graphOf([...topical, ...relational]);

    const result = query(graph, ['sigma'], {
      maxResults: 10,
      subLayerFilter: 'topical',
    });

    expect(result.results).toHaveLength(10);
    for (const r of result.results)
      expect(graph.nodes.get(r.nodeId)?.subLayer).toBe('topical');
  });

  it('식별자 시드에 유일 매칭된 오래된 멤버가 대표로 승격된다', () => {
    const old = makeNode('04_Action/th-old.md', {
      clusterKey: 'th',
      updated: '2026-02-01',
      tags: ['tk-77', 'thread'],
    });
    const mid = makeNode('04_Action/th-mid.md', {
      clusterKey: 'th',
      updated: '2026-02-05',
      tags: ['thread'],
    });
    const digest = makeNode('04_Action/th-digest.md', {
      clusterKey: 'th',
      updated: '2026-02-09',
      tags: ['thread'],
    });
    const graph = graphOf([old, mid, digest]);

    const result = query(graph, ['tk-77'], { maxResults: 10 });

    expect(result.results[0]!.nodeId).toBe(toNodeId('04_Action/th-old.md'));
    expect(result.results[0]!.clusterKey).toBe('th');
  });

  it('path-exact 시드는 키워드 지목과 겹쳐도 결과 제외가 우선한다', () => {
    const a = makeNode('04_Action/a.md', {
      clusterKey: 'th',
      updated: '2026-02-01',
      tags: ['tk-88', 'thread'],
    });
    const b = makeNode('04_Action/b.md', {
      clusterKey: 'th',
      updated: '2026-02-05',
      tags: ['thread'],
    });
    const graph = graphOf(
      [a, b],
      [{ from: a.id, to: b.id, type: 'LINK' as const, weight: 1 }],
    );

    // 'tk-88' 은 a 를 유일 지목하지만, a 는 path-exact 시드라 결과에서 제외된다.
    const result = query(graph, ['04_Action/a.md', 'tk-88'], {
      maxResults: 10,
    });

    expect(
      result.results.some((r) => r.nodeId === toNodeId('04_Action/a.md')),
    ).toBe(false);
    const cluster = result.results.find((r) => r.clusterKey === 'th');
    expect(cluster?.nodeId).toBe(toNodeId('04_Action/b.md'));
  });

  it('캡으로 1건만 채택된 주제어 시드는 지목으로 오인되지 않는다', () => {
    // 'sig' 는 캡 이전 31건 매칭(클러스터 멤버 2건 포함). pagerank 정렬 캡(30)이
    // 클러스터 멤버 하나를 잘라 채택 집합에는 1건만 남지만, 지목 판정은 캡 이전
    // 집합 기준이라 성립하지 않는다 — 대표는 updated 최신 전역 멤버.
    const fillers = Array.from({ length: 29 }, (_, i) =>
      makeNode(`04_Action/f-${String(i).padStart(2, '0')}.md`, {
        tags: ['sig'],
        pagerank: 1,
      }),
    );
    const capped = makeNode('04_Action/th-in-cap.md', {
      clusterKey: 'th',
      updated: '2026-02-01',
      tags: ['sig'],
      pagerank: 0.5,
    });
    const dropped = makeNode('04_Action/th-dropped.md', {
      clusterKey: 'th',
      updated: '2026-02-09',
      tags: ['sig'],
      pagerank: 0,
    });
    const graph = graphOf([...fillers, capped, dropped]);

    const result = query(graph, ['sig'], { maxResults: 40 });

    const cluster = result.results.find((r) => r.clusterKey === 'th');
    expect(cluster?.nodeId).toBe(toNodeId('04_Action/th-dropped.md'));
  });
});
