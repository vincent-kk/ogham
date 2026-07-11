/**
 * @file applyTimeWindow.ts
 * @description updated 시간창(since/until, inclusive)으로 결과를 필터링한다. query 의 slice(maxResults) 이전에 적용해야 truncation 전에 걸러진다.
 */
import { isDateInWindow } from '../../../core/dateFormat/index.js';
import type { ActivationResult, KnowledgeGraph } from '../../../types/graph.js';

export function applyTimeWindow(
  results: ActivationResult[],
  graph: KnowledgeGraph,
  since?: string,
  until?: string,
): ActivationResult[] {
  if (!since && !until) return results;
  return results.filter((r) => {
    const node = graph.nodes.get(r.nodeId);
    return node ? isDateInWindow(node.updated, since, until) : false;
  });
}
