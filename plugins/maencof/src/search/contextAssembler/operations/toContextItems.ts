/**
 * @file toContextItems.ts
 * @description ActivationResult 목록을 ContextItem 목록으로 변환한다.
 */
import type { ActivationResult, KnowledgeGraph } from '../../../types/graph.js';
import type { ContextItem } from '../types/types.js';

import { describeRelation } from './describeRelation.js';

export function toContextItems(
  results: ActivationResult[],
  graph: KnowledgeGraph,
): ContextItem[] {
  const items: ContextItem[] = [];

  for (const result of results) {
    const node = graph.nodes.get(result.nodeId);
    if (!node) continue;

    items.push({
      path: node.path,
      title: node.title,
      score: result.score,
      layer: node.layer as number,
      tags: node.tags,
      hops: result.hops,
      relation: describeRelation(result.hops),
    });
  }

  return items;
}
