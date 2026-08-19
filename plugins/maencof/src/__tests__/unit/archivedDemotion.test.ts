/**
 * @file archivedDemotion.test.ts
 * @description archived 스텁 침강 (R5) — 키워드 시드 점수와 kg_suggest_links 종합
 * 점수의 ARCHIVED_SEED_MULTIPLIER(0.3) 강등. P3 실측(스텁 0.4점 1위) 재현 방지.
 */
import { describe, expect, it } from 'vitest';

import { ARCHIVED_SEED_MULTIPLIER } from '../../constants/queryEngine.js';
import { handleKgSuggestLinks } from '../../mcp/tools/kgSuggestLinks/kgSuggestLinks.js';
import { resolveSeedNodes } from '../../search/queryEngine/index.js';
import { Layer, toNodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';

function makeNode(
  id: string,
  tags: string[],
  overrides?: Partial<KnowledgeNode>,
): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title: overrides?.title ?? id,
    layer: Layer.L2_DERIVED,
    tags,
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
    ...overrides,
  };
}

function graphOf(nodes: KnowledgeNode[]): KnowledgeGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes: nodeMap,
    edges: [],
    adjacencyList: new Map(),
    edgeWeightMap: new Map(),
    builtAt: '2026-08-20T04:00:00Z',
    nodeCount: nodeMap.size,
    edgeCount: 0,
  };
}

describe('archived 시드 강등 (R5)', () => {
  it('키워드 시드에서 archived 쌍둥이의 matchScore 가 0.3배로 강등된다', () => {
    const graph = graphOf([
      makeNode('02_Derived/live.md', ['phi'], { title: 'Phi Live' }),
      makeNode('02_Derived/stub.md', ['phi'], {
        title: 'Phi Stub',
        archived: true,
      }),
    ]);

    const { scored } = resolveSeedNodes(graph, ['phi']);

    const live = scored.find(
      (s) => s.nodeId === toNodeId('02_Derived/live.md'),
    );
    const stub = scored.find(
      (s) => s.nodeId === toNodeId('02_Derived/stub.md'),
    );
    expect(live).toBeDefined();
    expect(stub).toBeDefined();
    expect(stub!.matchScore).toBeCloseTo(
      live!.matchScore * ARCHIVED_SEED_MULTIPLIER,
      10,
    );
  });

  it('kg_suggest_links 에서 archived 스텁이 기본 min_score 아래로 침강한다 (0.4 → 0.12)', () => {
    // 소스 태그 5개 중 2개 겹침 → Jaccard 0.4. 비-archived 쌍둥이는 제안되고
    // archived 스텁은 0.4 × 0.3 = 0.12 < 0.2(기본 min_score)로 탈락해야 한다.
    const graph = graphOf([
      makeNode('02_Derived/source.md', ['phi', 'chi', 'aa', 'bb', 'cc']),
      makeNode('02_Derived/live-twin.md', ['phi', 'chi'], {
        title: 'Live Twin',
      }),
      makeNode('02_Derived/archived-stub.md', ['phi', 'chi'], {
        title: 'Archived Stub',
        archived: true,
      }),
    ]);

    const result = handleKgSuggestLinks(graph, {
      path: '02_Derived/source.md',
    });

    const paths = result.suggestions.map((s) => s.target_path);
    expect(paths).toContain('02_Derived/live-twin.md');
    expect(paths).not.toContain('02_Derived/archived-stub.md');
  });
});
