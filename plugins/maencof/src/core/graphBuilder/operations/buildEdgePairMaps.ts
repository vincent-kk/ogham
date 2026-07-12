/**
 * @file buildEdgePairMaps.ts
 * @description (from→to) 쌍별 가중치/타입 맵을 일관되게 구성한다.
 */
import { EDGE_TYPE_MULTIPLIER } from '../../../constants/spreadingActivation.js';
import type {
  EdgeTypeMap,
  EdgeWeightMap,
  KnowledgeEdge,
} from '../../../types/graph.js';

/**
 * (from→to) 쌍별 가중치/타입 맵을 일관되게 구성한다.
 *
 * 평행/중복 엣지가 동일 (from,to) 에 공존하면(예: LINK 와 SIBLING) 단일 슬롯만 남으므로,
 * EDGE_TYPE_MULTIPLIER 가 더 높은 타입을 결정적으로 채택한다(동률은 엣지 배열 순서상 먼저 등장한
 * 것 우선). weight 와 type 이 항상 같은 승자 엣지에서 나오도록 두 맵을 함께 만든다.
 */
export function buildEdgePairMaps(edges: Iterable<KnowledgeEdge>): {
  edgeWeightMap: EdgeWeightMap;
  edgeTypeMap: EdgeTypeMap;
} {
  const edgeWeightMap: EdgeWeightMap = new Map();
  const edgeTypeMap: EdgeTypeMap = new Map();
  for (const edge of edges) {
    let typeInner = edgeTypeMap.get(edge.from);
    let weightInner = edgeWeightMap.get(edge.from);
    if (!typeInner || !weightInner) {
      typeInner = new Map();
      weightInner = new Map();
      edgeTypeMap.set(edge.from, typeInner);
      edgeWeightMap.set(edge.from, weightInner);
    }
    const existingType = typeInner.get(edge.to);
    if (
      existingType !== undefined &&
      EDGE_TYPE_MULTIPLIER[existingType] >= EDGE_TYPE_MULTIPLIER[edge.type]
    )
      continue;

    typeInner.set(edge.to, edge.type);
    weightInner.set(edge.to, edge.weight);
  }
  return { edgeWeightMap, edgeTypeMap };
}
