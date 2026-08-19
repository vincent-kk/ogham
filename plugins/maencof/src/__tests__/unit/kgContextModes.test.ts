/**
 * @file kgContextModes.test.ts
 * @description kg_context 응답 모드 — include_content:false 문서 목록,
 *   include_full 스니펫의 token_budget 계상과 잔여 예산 연동 크기.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildAdjacencyList } from '../../core/graphBuilder/index.js';
import { handleKgContext } from '../../mcp/tools/kgContext/kgContext.js';
import { invalidateQueryCache } from '../../search/queryEngine/index.js';
import { estimateTokens } from '../../search/contextAssembler/operations/estimateTokens.js';
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
    builtAt: '2026-08-05T01:00:00Z',
    nodeCount: nodes.size,
    edgeCount: edges.length,
  };
}

describe('kg_context modes', () => {
  it('include_content=false면 조립 markdown 없이 문서 목록만 반환한다', async () => {
    const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
    nodes.set(
      toNodeId('epsilon-a.md'),
      makeNode('epsilon-a.md', Layer.L2_DERIVED, { title: 'Epsilon Topic' }),
    );
    nodes.set(
      toNodeId('epsilon-b.md'),
      makeNode('epsilon-b.md', Layer.L2_DERIVED, { title: 'Epsilon Note' }),
    );
    const graph = buildGraph(nodes, []);

    const result = await handleKgContext(graph, {
      query: 'epsilon',
      include_content: false,
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result).not.toHaveProperty('context');
    expect(result.documents).toBeDefined();
    const doc = result.documents!.find((d) => d.path === 'epsilon-a.md');
    expect(doc).toBeDefined();
    expect(doc!.title).toBe('Epsilon Topic');
    expect(typeof doc!.score).toBe('number');
    expect(result.documentCount).toBe(result.documents!.length);
  });

  describe('include_full 스니펫 예산 계상', () => {
    let vault: string;

    beforeEach(async () => {
      vault = await mkdtemp(join(tmpdir(), 'maencof-ctx-modes-'));
    });

    afterEach(async () => {
      await rm(vault, { recursive: true, force: true });
    });

    it('스니펫을 붙여도 컨텍스트가 token_budget을 넘지 않고 estimatedTokens에 계상된다', async () => {
      const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
      for (let i = 1; i <= 4; i++)
        nodes.set(
          toNodeId(`zeta-${i}.md`),
          makeNode(`zeta-${i}.md`, Layer.L2_DERIVED, {
            title: `Zeta Topic ${i}`,
          }),
        );
      const graph = buildGraph(nodes, []);

      const body =
        '---\nlayer: 2\n---\n\n' + 'zeta 내용 문장 반복. '.repeat(200);
      for (let i = 1; i <= 3; i++)
        await writeFile(join(vault, `zeta-${i}.md`), body, 'utf-8');

      // 기본 조립이 예산 안에 넉넉히 들어오는 픽스처 — 이 테스트가 고정하는 것은
      // "스니펫 추가가 예산을 넘기지 않는다"는 성질이다.
      const tokenBudget = 200;
      const result = await handleKgContext(
        graph,
        { query: 'zeta', token_budget: tokenBudget, include_full: true },
        vault,
      );

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.context).toBeDefined();
      expect(estimateTokens(result.context!)).toBeLessThanOrEqual(tokenBudget);
      expect(result.estimatedTokens!).toBeLessThanOrEqual(tokenBudget);
    });

    it('잔여 예산이 넉넉하면 스니펫 상한이 종전 고정 300자를 넘어 자란다', async () => {
      const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
      nodes.set(
        toNodeId('omega.md'),
        makeNode('omega.md', Layer.L2_DERIVED, { title: 'Omega Topic' }),
      );
      const graph = buildGraph(nodes, []);

      const body = '---\nlayer: 2\n---\n\n' + 'omega '.repeat(300).trim();
      await writeFile(join(vault, 'omega.md'), body, 'utf-8');

      const result = await handleKgContext(
        graph,
        { query: 'omega', token_budget: 2000, include_full: true },
        vault,
      );

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      const snippet = result.context!.split('```')[1]?.trim() ?? '';
      expect(snippet.length).toBeGreaterThan(300);
      expect(snippet.endsWith('…')).toBe(true);
    });

    it('잔여 예산이 없으면 include_full이어도 스니펫을 붙이지 않는다', async () => {
      const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
      for (let i = 1; i <= 6; i++)
        nodes.set(
          toNodeId(`theta-${i}.md`),
          makeNode(`theta-${i}.md`, Layer.L2_DERIVED, {
            title: `Theta Topic Number ${i} With A Fairly Long Title For Budget Tests`,
            tags: ['theta', 'budget', 'exhaustion'],
          }),
        );
      const graph = buildGraph(nodes, []);

      for (let i = 1; i <= 6; i++)
        await writeFile(
          join(vault, `theta-${i}.md`),
          '---\nlayer: 2\n---\n\ntheta 본문입니다.',
          'utf-8',
        );

      const result = await handleKgContext(
        graph,
        { query: 'theta', token_budget: 100, include_full: true },
        vault,
      );

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.context).not.toContain('###');
    });
  });
});

describe('kg_context — cluster collapse 표기 (R4)', () => {
  beforeEach(() => {
    // buildGraph 헬퍼가 builtAt 을 고정하므로 파일 내 앞선 쿼리의 캐시가 섞이지 않게 비운다
    invalidateQueryCache();
  });

  function makeOmegaClusterGraph(): KnowledgeGraph {
    const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
    const members = ['2026-02-01', '2026-02-03', '2026-02-02'].map(
      (updated, i) =>
        makeNode(`04_Action/omega-${i}.md`, Layer.L4_ACTION, {
          title: `Omega Update ${i}`,
          tags: ['omega'],
          updated,
          clusterKey: 'omega-thread',
        }),
    );
    for (const n of members) nodes.set(n.id, n);
    return buildGraph(nodes, []);
  }

  it('documents 모드 항목에 clusterKey 와 collapsedCount 가 실린다', async () => {
    const result = await handleKgContext(makeOmegaClusterGraph(), {
      query: 'omega',
      include_content: false,
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.documents).toHaveLength(1);
    expect(result.documents![0]!.path).toBe('04_Action/omega-1.md');
    expect(result.documents![0]!.clusterKey).toBe('omega-thread');
    expect(result.documents![0]!.collapsedCount).toBe(2);
  });

  it('content 모드 markdown 에 접힘·열기 키 표기가 나타난다', async () => {
    const result = await handleKgContext(makeOmegaClusterGraph(), {
      query: 'omega',
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.context).toContain('(+2 collapsed · cluster: omega-thread)');
  });
});
