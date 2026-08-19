/**
 * @file applySubLayerFilter.ts
 * @description 서브레이어 pre-filter — layerFilter 와 같은 위치(collapse·절단 전)에서
 * 적용한다. 소비자의 post-slice 필터는 maxResults 미달을 만들므로 금지다.
 */
import type { SubLayer } from '../../../types/common.js';
import type { ActivationResult, KnowledgeGraph } from '../../../types/graph.js';

export function applySubLayerFilter(
  results: ActivationResult[],
  graph: KnowledgeGraph,
  subLayer: SubLayer,
): ActivationResult[] {
  return results.filter(
    (r) => graph.nodes.get(r.nodeId)?.subLayer === subLayer,
  );
}
