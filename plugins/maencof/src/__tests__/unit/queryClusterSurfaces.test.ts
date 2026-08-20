/**
 * @file queryClusterSurfaces.test.ts
 * @description 클러스터 표면 — R9 collapsedMembers(접힌 활성 멤버 목록, 상한 5)와
 * R10 clusterMatches(시드 접촉 클러스터 보고)의 엔진 표면 검증.
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
