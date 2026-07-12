/**
 * @file buildGraph.ts
 * @description KnowledgeNode[] → KnowledgeGraph 변환, 인접 리스트 구성, 고립 노드 탐지.
 */
import type { NodeId } from '../../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../../types/graph.js';
import {
  buildCrossLayerEdges,
  buildDomainEdges,
  buildHierarchyEdges,
  buildRelationshipEdges,
} from '../builders/index.js';
import { buildInvertedIndex } from '../invertedIndex/buildInvertedIndex.js';
import type { GraphBuildResult, GraphBuilderOptions } from '../types/types.js';

import { buildAdjacencyList } from './buildAdjacencyList.js';
import { detectOrphans } from './detectOrphans.js';

/**
 * 파싱된 KnowledgeNode 목록으로부터 KnowledgeGraph를 구성한다.
 * - LINK 엣지: 각 노드의 outboundLinks에서 생성
 * - PARENT_OF / CHILD_OF: 디렉토리 계층에서 생성
 * - SIBLING 은 물질화하지 않음 — 런타임 맵 구성 시 파생 (deriveSiblingEdges)
 */
export function buildGraph(
  nodes: KnowledgeNode[],
  options: GraphBuilderOptions = {},
): GraphBuildResult {
  const { includeOrphans = true } = options;

  const nodeMap = new Map<NodeId, KnowledgeNode>();
  for (const node of nodes) nodeMap.set(node.id, node);

  const edges: KnowledgeEdge[] = [];

  // LINK 엣지는 kg-build가 채운 outboundLinks 필드로부터 생성
  for (const node of nodes)
    if (node.outboundLinks)
      for (const target of node.outboundLinks) {
        const targetId = target as NodeId;
        if (nodeMap.has(targetId))
          edges.push({
            from: node.id,
            to: targetId,
            type: 'LINK',
            weight: 1.0,
          });
      }

  // 디렉토리 계층 엣지 (PARENT_OF / CHILD_OF)
  const hierarchyEdges = buildHierarchyEdges(nodes, nodeMap);
  for (const e of hierarchyEdges) edges.push(e);

  // RELATIONSHIP 엣지: person frontmatter가 있는 노드 쌍 간 관계 엣지 생성
  const relationshipEdges = buildRelationshipEdges(nodes);
  for (const e of relationshipEdges) edges.push(e);

  // Domain cross-layer 연결: 동일 domain 태그를 가진 노드 간 약한 LINK 엣지 (weight=0.3)
  const domainEdges = buildDomainEdges(nodes);
  for (const e of domainEdges) edges.push(e);

  // CROSS_LAYER 엣지: L5-Boundary 노드에서 connected_layers 내 태그 겹침 노드로
  const crossLayerEdges = buildCrossLayerEdges(nodes);
  for (const e of crossLayerEdges) edges.push(e);

  const graph: KnowledgeGraph = {
    nodes: nodeMap,
    edges,
    builtAt: new Date().toISOString(),
    nodeCount: nodeMap.size,
    edgeCount: edges.length,
  };

  const adjacencyList = buildAdjacencyList(nodeMap, edges);
  const invertedIndex = buildInvertedIndex(nodeMap);
  const orphanNodes = detectOrphans(nodeMap, edges);

  if (!includeOrphans) {
    for (const orphanId of orphanNodes) graph.nodes.delete(orphanId);

    graph.nodeCount = graph.nodes.size;
  }

  return { graph, adjacencyList, invertedIndex, orphanNodes };
}
