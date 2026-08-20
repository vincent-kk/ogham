/**
 * @file kgSearchClusterPipeline.test.ts
 * @description cluster 결과 파이프라인 계약 — 필터(시간창·match)→정렬→계수→절단 순서 고정.
 *   핵심 계약: 정렬 하위(오래된 updated)의 매칭 항목도 절단에서 생존한다 —
 *   절단이 필터보다 먼저 오면 최신 비매칭 항목이 자리를 차지해 조용히 유실된다.
 */
import { describe, expect, it } from 'vitest';

import { buildAdjacencyList } from '../../core/graphBuilder/index.js';
import { handleKgSearch } from '../../mcp/tools/kgSearch/kgSearch.js';
import { Layer, toNodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

function makeNode(
  id: string,
  layer: Layer,
  overrides?: Partial<KnowledgeNode>,
): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title: overrides?.title ?? id,
    layer,
    tags: overrides?.tags ?? [],
    created: '2026-08-05',
    updated: '2026-08-05',
    mtime: 0,
    accessed_count: 0,
    ...overrides,
  };
}

function buildGraph(
  nodes: Map<ReturnType<typeof toNodeId>, KnowledgeNode>,
  edges: KnowledgeEdge[],
): KnowledgeGraph {
  const adjacencyList = buildAdjacencyList(nodes, edges);
  const edgeWeightMap = new Map<
    ReturnType<typeof toNodeId>,
    Map<ReturnType<typeof toNodeId>, number>
  >();

  return {
    nodes,
    edges,
    adjacencyList,
    edgeWeightMap,
    builtAt: '2026-08-21T00:00:00Z',
    nodeCount: nodes.size,
    edgeCount: edges.length,
  };
}

/**
 * 'gn' 클러스터 — 노드 매칭 1건 + 서고 8건(최신 비매칭 5 + 오래된 매칭 3).
 * updated 내림차순 전량: harness-note(08-21) > bulk-0..4(08-20) > a-mid(06-06) > a-tag(05-01) > a-old(03-01).
 */
function makePipelineGraph(): KnowledgeGraph {
  const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
  const nodeMember = makeNode('04_Action/harness-note.md', Layer.L4_ACTION, {
    title: '하네스 엔지니어링 노트',
    updated: '2026-08-21',
    clusterKey: 'gn',
  });
  nodes.set(nodeMember.id, nodeMember);

  const graph = buildGraph(nodes, []);
  graph.archiveClusterMembers = new Map([
    [
      'gn',
      [
        ...Array.from({ length: 5 }, (_, i) => ({
          clusterKey: 'gn',
          path: `99_Archive/gn/bulk-${i}.md`,
          title: `Bulk ${i}`,
          updated: '2026-08-20',
          tags: ['geeknews'],
        })),
        {
          clusterKey: 'gn',
          path: '99_Archive/gn/a-mid.md',
          title: '하네스 시대',
          updated: '2026-06-06',
          tags: ['geeknews'],
        },
        {
          clusterKey: 'gn',
          path: '99_Archive/gn/a-tag.md',
          title: 'plain title',
          updated: '2026-05-01',
          tags: ['harness-하네스'],
        },
        {
          clusterKey: 'gn',
          path: '99_Archive/gn/a-old.md',
          title: 'Impeccable 하네스',
          updated: '2026-03-01',
          tags: ['geeknews'],
        },
      ],
    ],
  ]);
  return graph;
}

/**
 * 'cve' 클러스터 축소판 — 같은 updated(2026-07-24) 서고 7건 + 이전 날짜(2026-07-08) 2건.
 * 같은 날짜 그룹이 페이지 크기를 초과하는 실측 분포(하루 133건)의 재현이다 —
 * 날짜 입도 until 커서는 이 경계에서 정지하고, offset 커서는 완주해야 한다.
 */
function makeSameDayGraph(): KnowledgeGraph {
  const graph = buildGraph(new Map(), []);
  graph.archiveClusterMembers = new Map([
    [
      'cve',
      [
        ...Array.from({ length: 7 }, (_, i) => ({
          clusterKey: 'cve',
          path: `99_Archive/cve/same-${i}.md`,
          title: `Same-day ${i}`,
          updated: '2026-07-24',
          tags: ['cve'],
        })),
        ...Array.from({ length: 2 }, (_, i) => ({
          clusterKey: 'cve',
          path: `99_Archive/cve/old-${i}.md`,
          title: `Older ${i}`,
          updated: '2026-07-08',
          tags: ['cve'],
        })),
      ],
    ],
  ]);
  return graph;
}

describe('handleKgSearch — cluster offset paging', () => {
  it('cluster 항목은 노드·서고 멤버 공통으로 정렬 키 updated 를 싣는다', async () => {
    const result = await handleKgSearch(makePipelineGraph(), {
      cluster: 'gn',
      max_results: 3,
    });

    if ('error' in result) throw new Error(result.error);
    expect(result.results.map((r) => r.updated)).toEqual([
      '2026-08-21',
      '2026-08-20',
      '2026-08-20',
    ]);
    expect(result.results[0]!.archived).toBeUndefined();
  });

  it('같은 updated 그룹이 페이지 크기를 초과해도 offset 왕복이 전 멤버를 중복 없이 완주한다', async () => {
    const graph = makeSameDayGraph();
    const seen: string[] = [];
    for (const offset of [0, 3, 6]) {
      const page = await handleKgSearch(graph, {
        cluster: 'cve',
        max_results: 3,
        offset,
      });
      if ('error' in page) throw new Error(page.error);
      expect(page.clusterSize).toBe(9);
      expect(page.results).toHaveLength(3);
      expect(page.truncated).toBe(offset < 6 ? true : undefined);
      seen.push(...page.results.map((r) => r.path));
    }
    expect(new Set(seen).size).toBe(9);
    // 마지막 페이지가 같은 날짜 경계(same-6)를 넘어 이전 날짜로 진행한다
    expect(seen.slice(6)).toEqual([
      '99_Archive/cve/same-6.md',
      '99_Archive/cve/old-0.md',
      '99_Archive/cve/old-1.md',
    ]);
  });

  it('offset 은 match 필터·정렬 이후의 목록에 적용된다', async () => {
    const result = await handleKgSearch(makePipelineGraph(), {
      cluster: 'gn',
      match: '하네스',
      max_results: 2,
      offset: 2,
    });

    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(4);
    expect(result.results.map((r) => r.path)).toEqual([
      '99_Archive/gn/a-tag.md',
      '99_Archive/gn/a-old.md',
    ]);
    expect(result.truncated).toBeUndefined();
  });

  it('offset 이 clusterSize 이상이면 빈 results·truncated 부재·clusterSize 유지다', async () => {
    const result = await handleKgSearch(makeSameDayGraph(), {
      cluster: 'cve',
      offset: 9,
    });

    if ('error' in result) throw new Error(result.error);
    expect(result.results).toEqual([]);
    expect(result.truncated).toBeUndefined();
    expect(result.clusterSize).toBe(9);
  });
});

describe('handleKgSearch — cluster pipeline contract (filter→sort→count→cut)', () => {
  it('오래된 매칭 항목이 max_results 절단에서 생존하고 최신 비매칭 항목은 자리를 차지하지 않는다', async () => {
    const result = await handleKgSearch(makePipelineGraph(), {
      cluster: 'gn',
      match: '하네스',
      max_results: 3,
    });

    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(4);
    expect(result.truncated).toBe(true);
    // 매칭 4건 중 updated 상위 3건 — 절단이 필터보다 먼저면 bulk(08-20)가 여길 차지한다
    expect(result.results.map((r) => r.path)).toEqual([
      '04_Action/harness-note.md',
      '99_Archive/gn/a-mid.md',
      '99_Archive/gn/a-tag.md',
    ]);
    // 노드·서고 멤버 동일 규칙 — 매칭 결과에 양쪽이 함께 있고 archived 구분은 유지된다
    expect(result.results[0]!.archived).toBeUndefined();
    expect(result.results[1]!.archived).toBe(true);
  });

  it('match 는 tags 에도 적용되고 needle 대소문자를 무시한다', async () => {
    const result = await handleKgSearch(makePipelineGraph(), {
      cluster: 'gn',
      match: 'HARNESS',
    });

    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(1);
    expect(result.results.map((r) => r.path)).toEqual([
      '99_Archive/gn/a-tag.md',
    ]);
  });

  it('match 와 since/until 시간창은 AND 조합된다', async () => {
    const result = await handleKgSearch(makePipelineGraph(), {
      cluster: 'gn',
      match: '하네스',
      since: '2026-06-01',
    });

    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(2);
    expect(result.results.map((r) => r.path)).toEqual([
      '04_Action/harness-note.md',
      '99_Archive/gn/a-mid.md',
    ]);
  });

  it('매칭 0건이면 clusterSize 0·빈 results·truncated 부재다', async () => {
    const result = await handleKgSearch(makePipelineGraph(), {
      cluster: 'gn',
      match: 'nonexistent-topic',
    });

    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(0);
    expect(result.results).toEqual([]);
    expect(result.truncated).toBeUndefined();
  });

  it('match 미지정 호출은 기존 전량 열거와 동일하다', async () => {
    const result = await handleKgSearch(makePipelineGraph(), {
      cluster: 'gn',
    });

    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(9);
    expect(result.truncated).toBeUndefined();
  });
});
