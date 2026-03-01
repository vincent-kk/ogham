/**
 * @file kg-search.ts
 * @description kg_search 도구 핸들러 — SA 기반 관련 문서 검색
 */
import { query } from '../../search/query-engine.js';
import type { KnowledgeGraph } from '../../types/graph.js';
import type { KgSearchInput, KgSearchResult } from '../../types/mcp.js';

/**
 * kg_search 핸들러
 *
 * @param graph - 로드된 지식 그래프 (null이면 미빌드 오류 반환)
 * @param input - 도구 입력
 */
export async function handleKgSearch(
  graph: KnowledgeGraph | null,
  input: KgSearchInput,
): Promise<KgSearchResult | { error: string }> {
  if (!graph) {
    return {
      error: 'Index not built. Please run /maencof:build first.',
    };
  }

  const startTime = Date.now();

  const result = query(graph, input.seed, {
    maxResults: input.max_results ?? 10,
    decay: input.decay ?? 0.7,
    threshold: input.threshold ?? 0.1,
    maxHops: input.max_hops ?? 5,
    layerFilter: input.layer_filter as number[] | undefined,
  });

  return {
    results: result.results,
    durationMs: Date.now() - startTime,
    exploredNodes: result.exploredNodes,
  };
}
