/**
 * @file seedResolutionSurface.test.ts
 * @description kg_search/kg_context/kg_suggest_links 핸들러의 seedResolution 응답 계약 —
 * resolved 계수 상시 노출, unresolved 조건부 키, kg_context 단어 단위 필터.
 */
import { describe, expect, it } from 'vitest';

import { hydrateRuntimeMaps } from '../../core/graphBuilder/index.js';
import { handleKgContext } from '../../mcp/tools/kgContext/kgContext.js';
import { handleKgSearch } from '../../mcp/tools/kgSearch/kgSearch.js';
import { handleKgSuggestLinks } from '../../mcp/tools/kgSuggestLinks/kgSuggestLinks.js';
import type { NodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';
import type { KgContextResult, KgSearchResult } from '../../types/mcp.js';

function node(id: string, title = id, tags: string[] = []): KnowledgeNode {
  return {
    id: id as NodeId,
    path: id,
    title,
    layer: 2,
    tags,
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
    pagerank: 0,
  } as KnowledgeNode;
}

function makeGraph(nodes: KnowledgeNode[]): KnowledgeGraph {
  const g: KnowledgeGraph = {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges: [],
    builtAt: 'seed-resolution-surface',
    nodeCount: nodes.length,
    edgeCount: 0,
  };
  hydrateRuntimeMaps(g);
  return g;
}

async function searchOf(
  graph: KnowledgeGraph,
  seed: string[],
): Promise<KgSearchResult> {
  const result = await handleKgSearch(graph, { seed });
  expect('error' in result).toBe(false);
  return result as KgSearchResult;
}

async function contextOf(
  graph: KnowledgeGraph,
  query: string,
  includeContent = true,
): Promise<KgContextResult> {
  const result = await handleKgContext(graph, {
    query,
    include_content: includeContent,
  });
  expect('error' in result).toBe(false);
  return result as KgContextResult;
}

describe('kg_search — seedResolution contract', () => {
  it('partial failure lists dead seeds and counts survivors', async () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['finance'])]);
    const r = await searchOf(g, ['investment', 'Worker', 'Threads']);
    expect(r.seedResolution.resolved).toEqual({ investment: 1 });
    expect(r.seedResolution.unresolved).toEqual(['Worker', 'Threads']);
    expect(r.results.length).toBeGreaterThan(0);
  });

  it('full success keeps resolved counts with no unresolved key', async () => {
    const g = makeGraph([
      node('a.md', 'investment thesis', ['finance']),
      node('b.md', 'fomo culture', ['psychology']),
    ]);
    const r = await searchOf(g, ['investment', 'fomo']);
    expect(r.seedResolution.resolved['investment']).toBe(1);
    expect(r.seedResolution.resolved['fomo']).toBe(1);
    expect('unresolved' in r.seedResolution).toBe(false);
  });

  it('total failure reports empty resolved and full unresolved', async () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['finance'])]);
    const r = await searchOf(g, ['wxyzq seed rule']);
    expect(r.results).toEqual([]);
    expect(r.exploredNodes).toBe(0);
    expect(r.seedResolution.resolved).toEqual({});
    expect(r.seedResolution.unresolved).toEqual(['wxyzq seed rule']);
  });
});

describe('kg_context — word-level seedResolution contract', () => {
  it('reports dead words only, never derived bigrams', async () => {
    const g = makeGraph([
      node('a.md', 'investment thesis', ['finance']),
      node('b.md', 'fomo culture', ['psychology']),
    ]);
    const r = await contextOf(g, 'investment zebraq fomo');
    expect(r.seedResolution.unresolved).toEqual(['zebraq']);
    expect(r.seedResolution.resolved['investment']).toBe(1);
    expect(r.seedResolution.resolved['fomo']).toBe(1);
    for (const key of Object.keys(r.seedResolution.resolved))
      expect(key.includes(' ')).toBe(false);
  });

  it('paths mode carries the same field', async () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['finance'])]);
    const r = await contextOf(g, 'investment zebraq', false);
    expect(r.documents).toBeDefined();
    expect(r.seedResolution.unresolved).toEqual(['zebraq']);
    expect(r.seedResolution.resolved['investment']).toBe(1);
  });

  it('all-resolved query has no unresolved key', async () => {
    const g = makeGraph([
      node('a.md', 'investment thesis', ['finance']),
      node('b.md', 'investment fomo notes', ['finance']),
    ]);
    const r = await contextOf(g, 'investment fomo');
    expect('unresolved' in r.seedResolution).toBe(false);
    expect(r.seedResolution.resolved['investment']).toBe(2);
  });
});

describe('kg_suggest_links — input tag resolution contract', () => {
  it('mixed tags report holder counts and absent tags verbatim', () => {
    const g = makeGraph([
      node('a.md', '주간보고 루틴', ['weekly-report', 'routine']),
      node('b.md', '주간보고 체크리스트', ['weekly-report', 'checklist']),
    ]);
    const r = handleKgSuggestLinks(g, {
      tags: ['weekly-report', '회고루틴'],
    });
    expect(r.seedResolution).toBeDefined();
    expect(r.seedResolution!.resolved).toEqual({ 'weekly-report': 2 });
    expect(r.seedResolution!.unresolved).toEqual(['회고루틴']);
  });

  it('all-absent tags pair unresolved with the silent empty envelope', () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['finance'])]);
    const r = handleKgSuggestLinks(g, { tags: ['회고루틴'] });
    expect(r.suggestions).toEqual([]);
    expect(r.candidates_explored).toBe(0);
    expect(r.seedResolution!.resolved).toEqual({});
    expect(r.seedResolution!.unresolved).toEqual(['회고루틴']);
  });

  it('path-only input carries no seedResolution field', () => {
    const g = makeGraph([
      node('a.md', 'investment thesis', ['finance']),
      node('b.md', 'fomo culture', ['finance']),
    ]);
    const r = handleKgSuggestLinks(g, { path: 'a.md' });
    expect('seedResolution' in r).toBe(false);
  });

  it('prototype-named tags are resolved like any other tag', () => {
    const g = makeGraph([
      node('a.md', '개발 노트', ['constructor', 'toString', 'finance']),
      node('b.md', 'investment thesis', ['finance']),
    ]);
    const r = handleKgSuggestLinks(g, {
      tags: ['constructor', 'toString', 'finance', 'nope'],
    });
    expect(r.seedResolution!.resolved).toEqual({
      constructor: 1,
      toString: 1,
      finance: 2,
    });
    expect(r.seedResolution!.unresolved).toEqual(['nope']);
  });

  it('prototype-named seeds surface as unresolved in kg_search', async () => {
    const g = makeGraph([node('a.md', 'investment thesis', ['finance'])]);
    const r = await searchOf(g, ['__proto__', 'investment']);
    expect(r.seedResolution.unresolved).toEqual(['__proto__']);
    expect(r.seedResolution.resolved).toEqual({ investment: 1 });
  });
});
