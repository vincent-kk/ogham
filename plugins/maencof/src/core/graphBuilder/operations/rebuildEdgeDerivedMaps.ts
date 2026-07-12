/**
 * @file rebuildEdgeDerivedMaps.ts
 * @description 엣지 파생 런타임 맵(adjacencyList/edgeWeightMap/edgeTypeMap)만 재구성한다.
 */
import type { KnowledgeGraph } from '../../../types/graph.js';

import { buildAdjacencyList } from './buildAdjacencyList.js';
import { buildEdgePairMaps } from './buildEdgePairMaps.js';
import { edgesWithDerivedSiblings } from './deriveSiblingEdges.js';

/**
 * 엣지 파생 런타임 맵(adjacencyList/edgeWeightMap/edgeTypeMap)만 graph.edges 로부터 재구성한다.
 * invertedIndex 는 건드리지 않는다(호출자가 증분 유지). 맵이 부착돼 있지 않으면 no-op —
 * "맵 부재 → 폴백" 계약을 유지한다. partial-reindex 의 in-place edge 변경 후 맵 stale 을 막는다.
 * SIBLING 은 현재 graph.nodes 멤버십에서 매번 파생 — 새로 병합된 노드도 즉시 형제를 얻는다.
 */
export function rebuildEdgeDerivedMaps(graph: KnowledgeGraph): void {
  if (!graph.adjacencyList && !graph.edgeWeightMap && !graph.edgeTypeMap)
    return;

  const { edgeWeightMap, edgeTypeMap } = buildEdgePairMaps(
    edgesWithDerivedSiblings(graph),
  );
  graph.adjacencyList = buildAdjacencyList(
    graph.nodes,
    edgesWithDerivedSiblings(graph),
  );
  graph.edgeWeightMap = edgeWeightMap;
  graph.edgeTypeMap = edgeTypeMap;
}
