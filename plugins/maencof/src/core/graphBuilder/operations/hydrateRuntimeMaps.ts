/**
 * @file hydrateRuntimeMaps.ts
 * @description KnowledgeGraph 에 런타임 조회 맵을 nodes + edges 로부터 재구성해 부착한다.
 */
import type { KnowledgeGraph } from '../../../types/graph.js';
import { buildInvertedIndex } from '../invertedIndex/buildInvertedIndex.js';

import { buildAdjacencyList } from './buildAdjacencyList.js';
import { buildEdgePairMaps } from './buildEdgePairMaps.js';
import { edgesWithDerivedSiblings } from './deriveSiblingEdges.js';

/**
 * KnowledgeGraph 에 런타임 조회 맵(adjacencyList/edgeWeightMap/edgeTypeMap/invertedIndex)을
 * graph.nodes + graph.edges 로부터 재구성해 부착한다 (in-place mutate 후 동일 reference 반환).
 *
 * 빌드 직후(kgBuild)와 디스크 리로드(metadataStore.loadGraph)가 동일한 맵 구성 로직을 공유하는
 * 단일 출처. 이 함수가 build/load 경로 간 SA·시드 해석 의미론을 일치시킨다.
 * SIBLING 은 graph.edges 에 없고 이 시점에 디렉토리 멤버십에서 파생되어 맵에만 실린다.
 */
export function hydrateRuntimeMaps(graph: KnowledgeGraph): KnowledgeGraph {
  const { edgeWeightMap, edgeTypeMap } = buildEdgePairMaps(
    edgesWithDerivedSiblings(graph),
  );
  graph.adjacencyList = buildAdjacencyList(
    graph.nodes,
    edgesWithDerivedSiblings(graph),
  );
  graph.edgeWeightMap = edgeWeightMap;
  graph.edgeTypeMap = edgeTypeMap;
  graph.invertedIndex = buildInvertedIndex(graph.nodes);
  return graph;
}
