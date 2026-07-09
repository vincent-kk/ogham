/**
 * @file applyLayerFilter.ts
 * @description Layer 필터를 적용하여 결과를 필터링한다.
 */
import type { ActivationResult, KnowledgeGraph } from '../../../types/graph.js';

export function applyLayerFilter(
  results: ActivationResult[],
  graph: KnowledgeGraph,
  layerFilter: number[],
): ActivationResult[] {
  if (layerFilter.length === 0) return results;
  return results.filter((r) => {
    const node = graph.nodes.get(r.nodeId);
    return node && (layerFilter as number[]).includes(node.layer as number);
  });
}
