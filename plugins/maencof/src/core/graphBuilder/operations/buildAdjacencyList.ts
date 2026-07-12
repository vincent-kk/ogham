/**
 * @file buildAdjacencyList.ts
 * @description 인접 리스트 구성 (NodeId → 이웃 NodeId[]).
 */
import type { NodeId } from '../../../types/common.js';
import type {
  AdjacencyList,
  KnowledgeEdge,
  KnowledgeNode,
} from '../../../types/graph.js';

/**
 * 인접 리스트 구성 (NodeId → 이웃 NodeId[]).
 * 평행/중복 엣지(동일 from→to 가 LINK·SIBLING 등으로 중복)는 이웃을 1회만 등록한다 —
 * SA processNeighbor 는 중복에 멱등이지만 중복 제거로 불필요한 재처리와 degree 과대계산을 막는다.
 */
export function buildAdjacencyList(
  nodeMap: Map<NodeId, KnowledgeNode>,
  edges: Iterable<KnowledgeEdge>,
): AdjacencyList {
  const adj: AdjacencyList = new Map();
  const seen = new Map<NodeId, Set<NodeId>>();
  for (const id of nodeMap.keys()) {
    adj.set(id, []);
    seen.set(id, new Set());
  }
  for (const edge of edges) {
    const list = adj.get(edge.from);
    const seenSet = seen.get(edge.from);
    if (!list || !seenSet || seenSet.has(edge.to)) continue;
    seenSet.add(edge.to);
    list.push(edge.to);
  }
  return adj;
}
