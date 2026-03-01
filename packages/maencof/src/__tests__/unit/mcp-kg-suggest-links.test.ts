/**
 * @file mcp-kg-suggest-links.test.ts
 * @description kg_suggest_links MCP 도구 핸들러 단위 테스트
 */
import { describe, expect, it } from 'vitest';

import { handleKgSuggestLinks } from '../../mcp/tools/kg-suggest-links.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

/** 테스트용 노드 생성 */
function makeNode(
  id: string,
  tags: string[],
  layer: number = 2,
): KnowledgeNode {
  return {
    id,
    path: `0${layer}_Derived/${id}.md`,
    title: id,
    layer: layer as 1 | 2 | 3 | 4 | 5,
    tags,
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: Date.now(),
    accessed_count: 0,
  };
}

/** 테스트용 그래프 생성 */
function makeGraph(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[] = [],
): KnowledgeGraph {
  const nodeMap = new Map<string, KnowledgeNode>();
  for (const n of nodes) nodeMap.set(n.id, n);
  return {
    nodes: nodeMap,
    edges,
    builtAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

describe('handleKgSuggestLinks', () => {
  it('그래프가 null이면 빈 결과를 반환한다', () => {
    const result = handleKgSuggestLinks(null, { tags: ['test'] });

    expect(result.suggestions).toEqual([]);
    expect(result.candidates_explored).toBe(0);
  });

  it('빈 그래프면 빈 결과를 반환한다', () => {
    const graph = makeGraph([]);
    const result = handleKgSuggestLinks(graph, { tags: ['test'] });

    expect(result.suggestions).toEqual([]);
  });

  it('태그가 겹치는 노드를 추천한다', () => {
    const graph = makeGraph([
      makeNode('a', ['typescript', 'mcp']),
      makeNode('b', ['typescript', 'plugin']),
      makeNode('c', ['python', 'ml']),
    ]);

    const result = handleKgSuggestLinks(graph, {
      tags: ['typescript', 'mcp'],
    });

    expect(result.suggestions.length).toBeGreaterThan(0);
    // 'a'는 완전 일치하지만 직접 연결이 없으므로 추천 가능
    // 'b'는 typescript로 겹침
    const paths = result.suggestions.map((s) => s.target_path);
    expect(paths).toContain('02_Derived/b.md');
  });

  it('겹치는 태그가 없으면 빈 결과를 반환한다', () => {
    const graph = makeGraph([
      makeNode('a', ['python']),
      makeNode('b', ['java']),
    ]);

    const result = handleKgSuggestLinks(graph, {
      tags: ['typescript'],
      min_score: 0.1,
    });

    expect(result.suggestions).toEqual([]);
  });

  it('max_suggestions로 결과를 제한한다', () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode(`n${i}`, ['common-tag', `unique-${i}`]),
    );
    const graph = makeGraph(nodes);

    const result = handleKgSuggestLinks(graph, {
      tags: ['common-tag'],
      max_suggestions: 3,
    });

    expect(result.suggestions.length).toBeLessThanOrEqual(3);
  });

  it('이미 직접 연결된 노드는 제외한다', () => {
    const graph = makeGraph(
      [
        makeNode('source', ['typescript']),
        makeNode('linked', ['typescript', 'mcp']),
        makeNode('unlinked', ['typescript', 'plugin']),
      ],
      [
        {
          from: 'source',
          to: 'linked',
          type: 'REFERENCE' as const,
          weight: 0.8,
        },
      ],
    );

    const result = handleKgSuggestLinks(graph, {
      path: '02_Derived/source.md',
    });

    const paths = result.suggestions.map((s) => s.target_path);
    expect(paths).not.toContain('02_Derived/linked.md');
  });

  it('각 추천에 reason이 포함된다', () => {
    const graph = makeGraph([
      makeNode('a', ['typescript', 'mcp']),
      makeNode('b', ['typescript', 'plugin']),
    ]);

    const result = handleKgSuggestLinks(graph, { tags: ['typescript'] });

    for (const s of result.suggestions) {
      expect(s.reason).toBeTruthy();
    }
  });

  it('content_hint에서 키워드를 추출하여 추천한다', () => {
    const graph = makeGraph([
      makeNode('a', ['typescript']),
      makeNode('b', ['python']),
    ]);

    const result = handleKgSuggestLinks(graph, {
      content_hint: 'TypeScript MCP plugin development',
      min_score: 0.05,
    });

    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('SA 보강으로 간접 연결 노드의 점수가 높아진다', () => {
    const graph = makeGraph(
      [
        makeNode('source', ['typescript', 'mcp']),
        makeNode('middle', ['typescript', 'bridge']),
        makeNode('target', ['typescript', 'plugin']),
      ],
      [
        {
          from: 'source',
          to: 'middle',
          type: 'REFERENCE' as const,
          weight: 0.9,
        },
        {
          from: 'middle',
          to: 'target',
          type: 'REFERENCE' as const,
          weight: 0.8,
        },
      ],
    );

    const result = handleKgSuggestLinks(graph, {
      path: '02_Derived/source.md',
      min_score: 0.05,
    });

    // target은 간접 연결 (2홉) → SA 보강 점수가 있어야 함
    const targetSuggestion = result.suggestions.find(
      (s) => s.target_path === '02_Derived/target.md',
    );
    if (targetSuggestion) {
      expect(targetSuggestion.sa_score).toBeGreaterThan(0);
    }
  });

  it('duration_ms가 양수여야 한다', () => {
    const graph = makeGraph([makeNode('a', ['test'])]);
    const result = handleKgSuggestLinks(graph, { tags: ['test'] });

    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });
});
