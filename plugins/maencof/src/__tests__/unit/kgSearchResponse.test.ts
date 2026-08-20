/**
 * @file kgSearchResponse.test.ts
 * @description handleKgSearch 응답 형태 — 참조 메타(path·title·tags·gist) 기본,
 *   trace/content 는 옵션일 때만.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
  for (const edge of edges) {
    if (!edgeWeightMap.has(edge.from)) edgeWeightMap.set(edge.from, new Map());
    edgeWeightMap.get(edge.from)!.set(edge.to, edge.weight);
  }

  return {
    nodes,
    edges,
    adjacencyList,
    edgeWeightMap,
    builtAt: '2026-08-05T00:00:00Z',
    nodeCount: nodes.size,
    edgeCount: edges.length,
  };
}

/** seed-doc → linked-doc LINK 그래프. path-exact 시드는 결과에서 제외되므로 linked-doc 이 결과다. */
function makeSearchGraph(): KnowledgeGraph {
  const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
  nodes.set(
    toNodeId('04_Action/seed-doc.md'),
    makeNode('04_Action/seed-doc.md', Layer.L4_ACTION, {
      title: 'Delta Seed',
    }),
  );
  nodes.set(
    toNodeId('02_Derived/linked-doc.md'),
    makeNode('02_Derived/linked-doc.md', Layer.L2_DERIVED, {
      title: 'Delta Topic',
      tags: ['delta'],
      gist: 'delta 요약 한 줄',
    }),
  );
  const edges: KnowledgeEdge[] = [
    {
      from: toNodeId('04_Action/seed-doc.md'),
      to: toNodeId('02_Derived/linked-doc.md'),
      type: 'LINK',
      weight: 1.0,
    },
  ];
  return buildGraph(nodes, edges);
}

describe('handleKgSearch — response shape', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), 'maencof-kgsearch-resp-'));
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('기본 응답은 path·title·tags를 담고 hop 체인·nodeId를 싣지 않는다', async () => {
    const result = await handleKgSearch(makeSearchGraph(), {
      seed: ['04_Action/seed-doc.md'],
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const item = result.results.find(
      (r) => r.path === '02_Derived/linked-doc.md',
    );
    expect(item).toBeDefined();
    expect(item!.title).toBe('Delta Topic');
    expect(item!.tags).toEqual(['delta']);
    expect(item!.gist).toBe('delta 요약 한 줄');
    expect(item).not.toHaveProperty('trace');
    expect(item).not.toHaveProperty('nodeId');
    expect(item).not.toHaveProperty('content');
  });

  it('include_trace=true면 시드→노드 hop 경로를 trace로 싣는다', async () => {
    const result = await handleKgSearch(makeSearchGraph(), {
      seed: ['04_Action/seed-doc.md'],
      include_trace: true,
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const item = result.results.find(
      (r) => r.path === '02_Derived/linked-doc.md',
    );
    expect(item).toBeDefined();
    expect(Array.isArray(item!.trace)).toBe(true);
    expect(item!.trace).toContain(toNodeId('04_Action/seed-doc.md'));
  });

  it('include_content=true면 vault 파일 전문을 content로 싣는다', async () => {
    const body = '---\nlayer: 2\n---\n\nDelta 본문 전체입니다.';
    await mkdir(join(vault, '02_Derived'), { recursive: true });
    await writeFile(join(vault, '02_Derived/linked-doc.md'), body, 'utf-8');

    const result = await handleKgSearch(
      makeSearchGraph(),
      { seed: ['04_Action/seed-doc.md'], include_content: true },
      vault,
    );

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const item = result.results.find(
      (r) => r.path === '02_Derived/linked-doc.md',
    );
    expect(item).toBeDefined();
    expect(item!.content).toContain('Delta 본문 전체입니다.');
  });

  it('include_content여도 파일이 없는 노드는 content를 생략한다', async () => {
    const result = await handleKgSearch(
      makeSearchGraph(),
      { seed: ['04_Action/seed-doc.md'], include_content: true },
      vault,
    );

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    for (const r of result.results) expect(r.content).toBeUndefined();
  });
});

/** seed-doc 이 같은 clusterKey 스레드 3건 + 무관 문서 1건을 가리키는 그래프. */
function makeClusterGraph(): KnowledgeGraph {
  const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
  const seed = makeNode('02_Derived/seed-doc.md', Layer.L2_DERIVED, {
    title: 'Cluster Seed',
  });
  nodes.set(seed.id, seed);
  const members = ['2026-02-01', '2026-02-03', '2026-02-02'].map((updated, i) =>
    makeNode(`04_Action/th-${i}.md`, Layer.L4_ACTION, {
      title: `Thread ${i}`,
      updated,
      clusterKey: 'jira-th',
    }),
  );
  const other = makeNode('02_Derived/other.md', Layer.L2_DERIVED, {
    title: 'Other Doc',
  });
  for (const n of [...members, other]) nodes.set(n.id, n);
  const edges: KnowledgeEdge[] = [...members, other].map((n) => ({
    from: seed.id,
    to: n.id,
    type: 'LINK',
    weight: 1.0,
  }));
  return buildGraph(nodes, edges);
}

describe('handleKgSearch — cluster collapse and open (R4)', () => {
  it('seed 검색 응답의 접힌 항목이 clusterKey 와 collapsedCount 를 표기한다', async () => {
    const result = await handleKgSearch(makeClusterGraph(), {
      seed: ['02_Derived/seed-doc.md'],
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const clusterItems = result.results.filter(
      (r) => r.clusterKey === 'jira-th',
    );
    expect(clusterItems).toHaveLength(1);
    expect(clusterItems[0]!.path).toBe('04_Action/th-1.md');
    expect(clusterItems[0]!.collapsedCount).toBe(2);
  });

  it('cluster 열거 모드는 전역 멤버를 updated 내림차순으로 반환한다', async () => {
    const result = await handleKgSearch(makeClusterGraph(), {
      cluster: 'jira-th',
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.results.map((r) => r.path)).toEqual([
      '04_Action/th-1.md',
      '04_Action/th-2.md',
      '04_Action/th-0.md',
    ]);
    for (const r of result.results) {
      expect(r.score).toBe(0);
      expect(r.hops).toBe(0);
      expect(r.clusterKey).toBe('jira-th');
    }
    expect(result.cluster).toBe('jira-th');
    expect(result.clusterSize).toBe(3);
    expect(result.exploredNodes).toBe(0);
    expect(result.seedResolution.resolved).toEqual({});
  });

  it('seed 와 cluster 는 상호 배타이고 둘 다 없어도 오류다', async () => {
    const both = await handleKgSearch(makeClusterGraph(), {
      seed: ['x'],
      cluster: 'jira-th',
    });
    expect('error' in both).toBe(true);

    const neither = await handleKgSearch(makeClusterGraph(), {});
    expect('error' in neither).toBe(true);
  });

  it('cluster 열거가 서고 멤버를 병합해 archived 플래그와 updated 내림차순으로 반환한다', async () => {
    // makeClusterGraph(): jira-th 노드 3건 — th-1(2026-02-03) · th-2(2026-02-02) · th-0(2026-02-01)
    const graph = makeClusterGraph();
    graph.archiveClusterMembers = new Map([
      [
        'jira-th',
        [
          {
            clusterKey: 'jira-th',
            path: '99_Archive/jira/a-new.md',
            title: 'Newest archived',
            updated: '2026-08-19',
            tags: ['jira'],
          },
          {
            clusterKey: 'jira-th',
            path: '99_Archive/jira/a-old.md',
            title: 'Oldest archived',
            updated: '2020-01-01',
            tags: [],
          },
        ],
      ],
    ]);
    const result = await handleKgSearch(graph, { cluster: 'jira-th' });
    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(5);
    // 병합 정렬: updated 내림차순 — 서고 최신이 선두, 서고 최고(最古)가 말미
    expect(result.results.map((r) => r.path)).toEqual([
      '99_Archive/jira/a-new.md',
      '04_Action/th-1.md',
      '04_Action/th-2.md',
      '04_Action/th-0.md',
      '99_Archive/jira/a-old.md',
    ]);
    expect(result.results[0]!.archived).toBe(true);
    expect(result.results[0]!.title).toBe('Newest archived');
    // 노드 항목에는 archived 가 실리지 않는다
    expect(result.results[1]!.archived).toBeUndefined();
  });

  it('cluster 열거에 since/until 시간창이 병합 목록에 적용되고 clusterSize 는 창 내 총원이다', async () => {
    const graph = makeClusterGraph();
    graph.archiveClusterMembers = new Map([
      [
        'jira-th',
        [
          {
            clusterKey: 'jira-th',
            path: '99_Archive/jira/a-new.md',
            title: 'Newest archived',
            updated: '2026-08-19',
            tags: [],
          },
          {
            clusterKey: 'jira-th',
            path: '99_Archive/jira/a-old.md',
            title: 'Oldest archived',
            updated: '2020-01-01',
            tags: [],
          },
        ],
      ],
    ]);
    const result = await handleKgSearch(graph, {
      cluster: 'jira-th',
      since: '2026-02-02',
      until: '2026-03-01',
    });
    if ('error' in result) throw new Error(result.error);
    // 창 내: th-1(02-03)·th-2(02-02)만 — 서고 2건과 th-0(02-01)은 창 밖
    expect(result.clusterSize).toBe(2);
    expect(result.results.map((r) => r.path)).toEqual([
      '04_Action/th-1.md',
      '04_Action/th-2.md',
    ]);
  });

  it('archiveClusterMembers 미존재 그래프(구캐시)에서도 cluster 열거는 기존과 동일하다', async () => {
    const result = await handleKgSearch(makeClusterGraph(), {
      cluster: 'jira-th',
    });
    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(3); // 기존 '전역 멤버 updated 내림차순' 케이스와 동일
  });

  it('cluster 열거는 max_results 미지정 시 기본 페이지(50)로 절단하고 truncated 를 싣는다', async () => {
    const graph = makeClusterGraph(); // jira-th 노드 3건
    const bulk = Array.from({ length: 57 }, (_, i) => ({
      clusterKey: 'jira-th',
      path: `99_Archive/jira/bulk-${String(i).padStart(3, '0')}.md`,
      title: `Bulk ${i}`,
      updated: '2025-01-01',
      tags: [],
    }));
    graph.archiveClusterMembers = new Map([['jira-th', bulk]]);
    const result = await handleKgSearch(graph, { cluster: 'jira-th' });
    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(60);
    expect(result.results).toHaveLength(50);
    expect(result.truncated).toBe(true);
  });

  it('cluster 열거에 max_results 를 지정하면 그 수만큼 반환하고 clusterSize 는 총원을 유지한다', async () => {
    const graph = makeClusterGraph(); // jira-th 노드 3건
    const result = await handleKgSearch(graph, {
      cluster: 'jira-th',
      max_results: 2,
    });
    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(3);
    expect(result.results.map((r) => r.path)).toEqual([
      '04_Action/th-1.md',
      '04_Action/th-2.md',
    ]);
    expect(result.truncated).toBe(true);
  });

  it('max_results 가 MAX_CLUSTER_ENUMERATION 을 넘어도 200건으로 캡한다', async () => {
    const graph = makeClusterGraph(); // jira-th 노드 3건
    const bulk = Array.from({ length: 198 }, (_, i) => ({
      clusterKey: 'jira-th',
      path: `99_Archive/jira/bulk-${String(i).padStart(3, '0')}.md`,
      title: `Bulk ${i}`,
      updated: '2025-01-01',
      tags: [],
    }));
    graph.archiveClusterMembers = new Map([['jira-th', bulk]]);
    const result = await handleKgSearch(graph, {
      cluster: 'jira-th',
      max_results: 250,
    });
    if ('error' in result) throw new Error(result.error);
    expect(result.clusterSize).toBe(201);
    expect(result.results).toHaveLength(200);
    expect(result.truncated).toBe(true);
  });
});

/**
 * 시드 접촉 확장 그래프 — 'exp-th' 클러스터 13건. m-00·m-01 만 태그 tk-x 를 갖고
 * (매칭 2건 → 지목 불성립), 대표는 updated 최신 m-12 로 승계된다.
 */
function makeExpansionGraph(): KnowledgeGraph {
  const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
  for (let i = 0; i < 13; i++) {
    const n = makeNode(
      `04_Action/m-${String(i).padStart(2, '0')}.md`,
      Layer.L4_ACTION,
      {
        title: `Member ${i}`,
        updated: `2026-02-${String(i + 1).padStart(2, '0')}`,
        clusterKey: 'exp-th',
        tags: i < 2 ? ['tk-x'] : [],
      },
    );
    nodes.set(n.id, n);
  }
  return buildGraph(nodes, []);
}

/** 접촉 클러스터 6개 그래프 — 각 2멤버가 공유 태그 sigma 로 매칭된다 (지목 불성립). */
function makeManyTouchedGraph(): KnowledgeGraph {
  const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
  for (let i = 0; i < 6; i++) {
    for (const [suffix, updated] of [
      ['a', '2026-02-01'],
      ['b', '2026-02-05'],
    ] as const) {
      const n = makeNode(`04_Action/c${i}-${suffix}.md`, Layer.L4_ACTION, {
        title: `C${i} ${suffix}`,
        updated,
        clusterKey: `c${i}-th`,
        tags: ['sigma'],
      });
      nodes.set(n.id, n);
    }
  }
  return buildGraph(nodes, []);
}

describe('handleKgSearch — cluster expansion (R10)', () => {
  it('시드 접촉 클러스터의 접힌 항목은 expansion 을 matched-first 로 싣는다', async () => {
    const result = await handleKgSearch(makeExpansionGraph(), {
      seed: ['tk-x'],
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const item = result.results.find((r) => r.clusterKey === 'exp-th');
    expect(item).toBeDefined();
    expect(item!.path).toBe('04_Action/m-12.md');
    expect(item!.expansion).toBeDefined();
    // matched 멤버(updated 열위)가 선두 — matched 그룹 내부는 updated 내림차순
    expect(item!.expansion![0]).toMatchObject({
      path: '04_Action/m-01.md',
      matched: true,
    });
    expect(item!.expansion![1]).toMatchObject({
      path: '04_Action/m-00.md',
      matched: true,
    });
    expect(item!.expansion![2]!.path).toBe('04_Action/m-11.md');
    expect(item!.expansion![2]!.matched).toBeUndefined();
    // 상한 10 + 초과분 보고, 대표 자신은 목록에 없다
    expect(item!.expansion).toHaveLength(10);
    expect(item!.expansionOmitted).toBe(2);
    expect(item!.expansion!.some((e) => e.path === '04_Action/m-12.md')).toBe(
      false,
    );
  });

  it('확산 전용 클러스터의 접힌 항목은 collapsedMembers 만 싣는다', async () => {
    const result = await handleKgSearch(makeClusterGraph(), {
      seed: ['02_Derived/seed-doc.md'],
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const item = result.results.find((r) => r.clusterKey === 'jira-th');
    expect(item).toBeDefined();
    expect(item!.expansion).toBeUndefined();
    expect(item!.collapsedMembers).toEqual([
      '04_Action/th-0.md',
      '04_Action/th-2.md',
    ]);
  });

  it('expansion 이 있으면 collapsedMembers 를 싣지 않는다', async () => {
    const result = await handleKgSearch(makeExpansionGraph(), {
      seed: ['tk-x'],
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const item = result.results.find((r) => r.clusterKey === 'exp-th');
    expect(item!.expansion).toBeDefined();
    expect(item!.collapsedMembers).toBeUndefined();
  });

  it('전역 멤버가 대표뿐인 접촉 클러스터는 expansion 을 싣지 않는다', async () => {
    const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
    const solo = makeNode('04_Action/solo.md', Layer.L4_ACTION, {
      title: 'Solo',
      clusterKey: 'solo-th',
      tags: ['tk-solo'],
    });
    nodes.set(solo.id, solo);

    const result = await handleKgSearch(buildGraph(nodes, []), {
      seed: ['tk-solo'],
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const item = result.results.find((r) => r.clusterKey === 'solo-th');
    expect(item).toBeDefined();
    expect(item!.expansion).toBeUndefined();
    expect(item!.expansionOmitted).toBeUndefined();
    expect(item!.collapsedMembers).toBeUndefined();
  });

  it('접촉 클러스터가 상한을 넘으면 결과 상위 5개만 확장된다', async () => {
    const result = await handleKgSearch(makeManyTouchedGraph(), {
      seed: ['sigma'],
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.results).toHaveLength(6);
    for (let i = 0; i < 5; i++) {
      const item = result.results.find((r) => r.clusterKey === `c${i}-th`);
      expect(item!.expansion, `c${i}-th`).toBeDefined();
      expect(item!.collapsedMembers, `c${i}-th`).toBeUndefined();
    }
    const sixth = result.results.find((r) => r.clusterKey === 'c5-th');
    expect(sixth!.expansion).toBeUndefined();
    expect(sixth!.collapsedMembers).toEqual(['04_Action/c5-a.md']);
  });
});
