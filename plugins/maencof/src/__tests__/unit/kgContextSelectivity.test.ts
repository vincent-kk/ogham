/**
 * @file kgContextSelectivity.test.ts
 * @description kg_context 선별 축 테스트 — layer_filter/sub_layer pre-filter, scope 프리셋, 하위호환
 */
import { describe, expect, it } from 'vitest';

import { KgContextScope } from '../../constants/kgContext.js';
import { buildAdjacencyList } from '../../core/graphBuilder/graphBuilder.js';
import { handleKgContext } from '../../mcp/tools/kgContext/kgContext.js';
import { Layer, toNodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';
import type { KgContextInput, KgContextResult } from '../../types/mcp.js';

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
    created: '2026-07-07',
    updated: '2026-07-07',
    mtime: 0,
    accessed_count: 0,
    ...overrides,
  };
}

function makeEdge(from: string, to: string, weight = 0.8): KnowledgeEdge {
  return { from: toNodeId(from), to: toNodeId(to), type: 'LINK', weight };
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
    builtAt: '2026-07-07T00:00:00Z',
    nodeCount: nodes.size,
    edgeCount: edges.length,
  };
}

async function contextOf(
  graph: KnowledgeGraph,
  input: KgContextInput,
): Promise<KgContextResult> {
  const result = await handleKgContext(graph, input);
  expect('error' in result).toBe(false);
  return result as KgContextResult;
}

/** L2 다수(title 매칭, 고점수) + L3 하나(tag 매칭, 저점수) — 예산 경쟁 구도 */
function makeLayerBudgetGraph(): KnowledgeGraph {
  const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
  for (let i = 1; i <= 12; i++)
    nodes.set(
      toNodeId(`l2-${i}.md`),
      makeNode(`l2-${i}.md`, Layer.L2_DERIVED, { title: `Topic Note ${i}` }),
    );

  nodes.set(
    toNodeId('l3-target.md'),
    makeNode('l3-target.md', Layer.L3_EXTERNAL, {
      title: 'External Reference',
      tags: ['topic'],
    }),
  );
  return buildGraph(nodes, []);
}

describe('kg_context selectivity', () => {
  it('layer_filter 는 예산 소비 전에 적용된다 — 제외 레이어가 예산을 먹지 않는다', async () => {
    const graph = makeLayerBudgetGraph();

    const unfiltered = await contextOf(graph, {
      query: 'topic',
      token_budget: 100,
    });
    expect(unfiltered.truncatedCount).toBeGreaterThan(0);
    expect(unfiltered.context).not.toContain('External Reference');

    const filtered = await contextOf(graph, {
      query: 'topic',
      token_budget: 100,
      layer_filter: [Layer.L3_EXTERNAL],
    });
    expect(filtered.context).toContain('External Reference');
    expect(filtered.context).not.toContain('Topic Note');
    expect(filtered.truncatedCount).toBe(0);
  });

  it('sub_layer 필터가 조립 전에 적용된다', async () => {
    const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
    nodes.set(
      toNodeId('crew-person.md'),
      makeNode('crew-person.md', Layer.L3_EXTERNAL, {
        title: 'Crew Person Note',
        subLayer: 'relational',
      }),
    );
    nodes.set(
      toNodeId('crew-topic.md'),
      makeNode('crew-topic.md', Layer.L3_EXTERNAL, {
        title: 'Crew Topic Note',
        subLayer: 'topical',
      }),
    );
    const graph = buildGraph(nodes, []);

    const both = await contextOf(graph, { query: 'crew' });
    expect(both.documentCount).toBe(2);

    const relationalOnly = await contextOf(graph, {
      query: 'crew',
      sub_layer: 'relational',
    });
    expect(relationalOnly.context).toContain('Crew Person Note');
    expect(relationalOnly.context).not.toContain('Crew Topic Note');
  });

  it("scope 미지정 호출은 scope:'balanced' 와 동일한 결과를 반환한다 (하위호환)", async () => {
    const graph = makeLayerBudgetGraph();
    const implicit = await contextOf(graph, { query: 'topic' });
    const explicit = await contextOf(graph, {
      query: 'topic',
      scope: KgContextScope.BALANCED,
    });
    expect(explicit).toEqual(implicit);
  });

  it('focused 는 원거리 연결을 제외하고 broad 는 포함한다', async () => {
    const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
    const ids = ['hop-a.md', 'hop-b.md', 'hop-c.md', 'hop-d.md', 'hop-e.md'];
    for (const id of ids)
      nodes.set(toNodeId(id), makeNode(id, Layer.L2_DERIVED));

    const edges = [
      makeEdge('hop-a.md', 'hop-b.md'),
      makeEdge('hop-b.md', 'hop-c.md'),
      makeEdge('hop-c.md', 'hop-d.md'),
      makeEdge('hop-d.md', 'hop-e.md'),
    ];
    const graph = buildGraph(nodes, edges);

    const focused = await contextOf(graph, {
      query: 'hop-a.md',
      scope: KgContextScope.FOCUSED,
    });
    expect(focused.context).toContain('hop-b.md');
    expect(focused.context).not.toContain('hop-e.md');

    const broad = await contextOf(graph, {
      query: 'hop-a.md',
      scope: KgContextScope.BROAD,
    });
    expect(broad.context).toContain('hop-e.md');
  });
});
