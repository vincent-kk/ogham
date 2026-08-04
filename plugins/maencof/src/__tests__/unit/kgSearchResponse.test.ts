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
