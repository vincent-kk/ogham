/**
 * @file computeOneHopNeighbors.ts
 * @description 변경된 노드의 1-hop 이웃을 계산한다.
 */
import type { NodeId } from '../../../../types/common.js';
import type { KnowledgeGraph } from '../../../../types/graph.js';

/**
 * 변경된 노드의 1-hop 이웃을 계산한다.
 *
 * @param graph - 현재 지식 그래프
 * @param changedPaths - 변경된 파일 경로 목록
 * @returns 1-hop 이웃 NodeId 집합 (변경 노드 포함)
 */
export function computeOneHopNeighbors(
  graph: KnowledgeGraph,
  changedPaths: string[],
): Set<NodeId> {
  const affected = new Set<NodeId>();

  // 변경된 노드 자신 추가
  for (const path of changedPaths) {
    const nodeId = path as NodeId;
    if (graph.nodes.has(nodeId)) affected.add(nodeId);
  }

  // 1-hop 이웃 탐색
  for (const edge of graph.edges) {
    if (affected.has(edge.from) && graph.nodes.has(edge.to))
      affected.add(edge.to);

    if (affected.has(edge.to) && graph.nodes.has(edge.from))
      affected.add(edge.from);
  }

  return affected;
}
