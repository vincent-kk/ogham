/**
 * @file queryClusterSurfaces.test.ts
 * @description 클러스터 표면 — R9 collapsedMembers(접힌 활성 멤버 목록, 상한 5),
 * R10 clusterMatches(시드 접촉 클러스터 보고), R11 clusterseed 앵커 게이트와
 * path-exact 대표 승계 차단의 엔진 표면 검증.
 */
import { describe, expect, it } from 'vitest';

import { buildAdjacencyList } from '../../core/graphBuilder/index.js';
import { query } from '../../search/queryEngine/index.js';
import { collapseClusters } from '../../search/queryEngine/query/collapseClusters.js';
import { Layer, toNodeId } from '../../types/common.js';
import type { NodeId } from '../../types/common.js';
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

describe('collapsedMembers (R9)', () => {
  it('접힌 항목은 collapsedMembers 를 score 내림차순 상한 5로 싣는다', () => {
    // m7 이 updated 최신 대표 — 나머지 7건이 접히고 score 상위 5건만 목록에 실린다.
    const members = Array.from({ length: 8 }, (_, i) =>
      makeNode(`04_Action/m-${i}.md`, {
        clusterKey: 'th',
        updated: `2026-02-0${i + 1}`,
      }),
    );
    const graph = graphOf(members);
    const results = members.map((n, i) => activation(n.path, 0.8 - i * 0.05));

    const collapsed = collapseClusters(results, graph, anyNode);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]!.nodeId).toBe(toNodeId('04_Action/m-7.md'));
    expect(collapsed[0]!.collapsedCount).toBe(7);
    expect(collapsed[0]!.collapsedMembers).toEqual([
      toNodeId('04_Action/m-0.md'),
      toNodeId('04_Action/m-1.md'),
      toNodeId('04_Action/m-2.md'),
      toNodeId('04_Action/m-3.md'),
      toNodeId('04_Action/m-4.md'),
    ]);
  });

  it('접힘이 없으면 collapsedMembers 도 없다', () => {
    const graph = graphOf([
      makeNode('04_Action/solo.md', { clusterKey: 'th' }),
    ]);

    const collapsed = collapseClusters(
      [activation('04_Action/solo.md', 0.6)],
      graph,
      anyNode,
    );

    expect(collapsed[0]!.collapsedCount).toBeUndefined();
    expect(collapsed[0]!.collapsedMembers).toBeUndefined();
  });
});

describe('clusterMatches (R10)', () => {
  it('시드 매칭이 닿은 클러스터만 clusterMatches 에 실린다', () => {
    const a1 = makeNode('04_Action/a-1.md', {
      clusterKey: 'th',
      updated: '2026-02-01',
      tags: ['alpha'],
    });
    const a2 = makeNode('04_Action/a-2.md', {
      clusterKey: 'th',
      updated: '2026-02-05',
      tags: ['alpha'],
    });
    const graph = graphOf([a1, a2]);

    const result = query(graph, ['alpha'], { maxResults: 10 });

    expect(result.results.some((r) => r.clusterKey === 'th')).toBe(true);
    expect(result.clusterMatches).toEqual({
      th: [toNodeId('04_Action/a-1.md'), toNodeId('04_Action/a-2.md')],
    });
  });

  it('확산으로만 결과에 든 클러스터는 clusterMatches 에 없다', () => {
    const seed = makeNode('02_Derived/seed.md', {
      layer: Layer.L2_DERIVED,
      tags: ['beta'],
    });
    const c1 = makeNode('04_Action/c-1.md', {
      clusterKey: 'th2',
      updated: '2026-02-01',
    });
    const c2 = makeNode('04_Action/c-2.md', {
      clusterKey: 'th2',
      updated: '2026-02-05',
    });
    const graph = graphOf(
      [seed, c1, c2],
      [c1, c2].map((n) => ({
        from: seed.id,
        to: n.id,
        type: 'LINK' as const,
        weight: 1,
      })),
    );

    const result = query(graph, ['beta'], { maxResults: 10 });

    expect(result.results.some((r) => r.clusterKey === 'th2')).toBe(true);
    expect(result.clusterMatches?.['th2']).toBeUndefined();
  });
});

describe('clusterseed 앵커 게이트 (R11)', () => {
  it('clusterseed 노드는 확산만으로는 결과에 수록되지 않는다', () => {
    const n1 = makeNode('04_Action/n-1.md', { tags: ['zeta'] });
    const anchor = makeNode('03_External/clusterseeds/anchor.md', {
      layer: Layer.L3_EXTERNAL,
      subLayer: 'clusterseed',
    });
    const graph = graphOf(
      [n1, anchor],
      [{ from: n1.id, to: anchor.id, type: 'LINK' as const, weight: 1 }],
    );

    const result = query(graph, ['zeta'], { maxResults: 10 });

    expect(result.results.some((r) => r.nodeId === n1.id)).toBe(true);
    expect(result.results.some((r) => r.nodeId === anchor.id)).toBe(false);
  });

  it('시드로 특정된 clusterseed 노드는 결과에 남는다', () => {
    const anchor = makeNode('03_External/clusterseeds/anchor.md', {
      layer: Layer.L3_EXTERNAL,
      subLayer: 'clusterseed',
      tags: ['tk-anchor'],
    });
    const graph = graphOf([anchor]);

    const result = query(graph, ['tk-anchor'], { maxResults: 10 });

    expect(result.results.some((r) => r.nodeId === anchor.id)).toBe(true);
  });

  it('비매칭 앵커도 대표 승계는 가능하다', () => {
    // 주제어 2매칭(지목 불성립) — 대표는 updated 최신 전역 멤버(앵커)로 승계된다.
    const raw1 = makeNode('04_Action/cs-old-1.md', {
      clusterKey: 'cs-th',
      updated: '2026-02-01',
      tags: ['cs-topic'],
    });
    const raw2 = makeNode('04_Action/cs-old-2.md', {
      clusterKey: 'cs-th',
      updated: '2026-02-03',
      tags: ['cs-topic'],
    });
    const anchor = makeNode('03_External/clusterseeds/cs-anchor.md', {
      layer: Layer.L3_EXTERNAL,
      subLayer: 'clusterseed',
      clusterKey: 'cs-th',
      updated: '2026-02-09',
    });
    const graph = graphOf([raw1, raw2, anchor]);

    const result = query(graph, ['cs-topic'], { maxResults: 10 });

    const cluster = result.results.find((r) => r.clusterKey === 'cs-th');
    expect(cluster?.nodeId).toBe(anchor.id);
  });

  it('path-exact 시드로 제외된 노드는 대표 승계 후보에서도 제외된다', () => {
    // 주제어 2매칭(지목 불성립) 픽스처 — 지목이 성립하면 R8 규칙이 부활 경로를
    // 가려 이 절 가드가 무의미해진다. 차감이 없으면 a(최신)가 대표로 부활한다.
    const a = makeNode('04_Action/px-new.md', {
      clusterKey: 'px-th',
      updated: '2026-02-09',
    });
    const b1 = makeNode('04_Action/px-old-1.md', {
      clusterKey: 'px-th',
      updated: '2026-02-01',
      tags: ['cs2'],
    });
    const b2 = makeNode('04_Action/px-old-2.md', {
      clusterKey: 'px-th',
      updated: '2026-02-03',
      tags: ['cs2'],
    });
    const graph = graphOf([a, b1, b2]);

    const result = query(graph, ['04_Action/px-new.md', 'cs2'], {
      maxResults: 10,
    });

    expect(result.results.some((r) => r.nodeId === a.id)).toBe(false);
    const cluster = result.results.find((r) => r.clusterKey === 'px-th');
    expect(cluster?.nodeId).toBe(b2.id);
  });
});
