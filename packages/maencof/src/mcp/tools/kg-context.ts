/**
 * @file kg-context.ts
 * @description kg_context 도구 핸들러 — 토큰 최적화 컨텍스트 블록 반환
 */
import { assembleContext } from '../../search/context-assembler.js';
import { query } from '../../search/query-engine.js';
import type { KnowledgeGraph } from '../../types/graph.js';
import type { KgContextInput, KgContextResult } from '../../types/mcp.js';

/**
 * kg_context 핸들러
 */
export async function handleKgContext(
  graph: KnowledgeGraph | null,
  input: KgContextInput,
): Promise<KgContextResult | { error: string }> {
  if (!graph) {
    return {
      error: '인덱스가 빌드되지 않았습니다. /maencof:build를 먼저 실행하세요.',
    };
  }

  const tokenBudget = input.token_budget ?? 2000;

  // 쿼리 실행
  const queryResult = query(graph, [input.query], {
    maxResults: 20,
    decay: 0.7,
    threshold: 0.05,
    maxHops: 5,
  });

  // 컨텍스트 조립
  const assembled = assembleContext(queryResult.results, graph, {
    tokenBudget,
    includeFull: input.include_full ?? false,
  });

  return {
    context: assembled.markdown,
    documentCount: assembled.items.length,
    estimatedTokens: assembled.estimatedTokens,
    truncatedCount: assembled.truncatedCount,
  };
}
