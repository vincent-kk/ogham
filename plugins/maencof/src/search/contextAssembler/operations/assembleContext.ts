/**
 * @file assembleContext.ts
 * @description SA 결과를 AI 에이전트용 컨텍스트 블록으로 조립한다.
 */
import type { ActivationResult, KnowledgeGraph } from '../../../types/graph.js';
import type { AssembleOptions, AssembledContext } from '../types/types.js';

import { buildMarkdown } from './buildMarkdown.js';
import { selectItemsWithinBudget } from './selectItemsWithinBudget.js';
import { toContextItems } from './toContextItems.js';

/**
 * @param results - SA 결과 (score 내림차순)
 * @param graph - 지식 그래프
 * @param options - 조립 옵션
 * @returns 조립된 컨텍스트
 */
export function assembleContext(
  results: ActivationResult[],
  graph: KnowledgeGraph,
  options: AssembleOptions = {},
): AssembledContext {
  const {
    tokenBudget = 2000,
    includeFull = false,
    maxFullDocuments = 3,
  } = options;

  const allItems = toContextItems(results, graph);
  const { selectedItems, totalTokens, truncatedCount } =
    selectItemsWithinBudget(allItems, tokenBudget);

  // 전문 포함 (상위 N개) — 실제 파일 내용은 MCP 도구 계층에서 주입
  if (includeFull && selectedItems.length > 0) {
    const fullCount = Math.min(maxFullDocuments, selectedItems.length);
    for (let i = 0; i < fullCount; i++)
      selectedItems[i].fullContent = undefined;
  }

  const markdown = buildMarkdown(selectedItems, truncatedCount, includeFull);

  return {
    markdown,
    items: selectedItems,
    estimatedTokens: totalTokens,
    truncatedCount,
  };
}
