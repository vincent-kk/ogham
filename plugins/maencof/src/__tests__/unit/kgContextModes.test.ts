/**
 * @file kgContextModes.test.ts
 * @description kg_context 응답 모드 — include_content:false 문서 목록,
 *   include_full 스니펫의 token_budget 계상.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildAdjacencyList } from '../../core/graphBuilder/index.js';
import { handleKgContext } from '../../mcp/tools/kgContext/kgContext.js';
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
  });
});
