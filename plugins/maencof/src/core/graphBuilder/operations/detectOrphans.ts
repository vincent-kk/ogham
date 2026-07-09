/**
 * @file detectOrphans.ts
 * @description 고립 노드 탐지 — 엣지가 전혀 없는 노드 반환.
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeEdge, KnowledgeNode } from '../../../types/graph.js';

/**
 * 고립 노드 탐지: 엣지가 전혀 없는 노드 반환
 */
export function detectOrphans(
  nodeMap: Map<NodeId, KnowledgeNode>,
  edges: KnowledgeEdge[],
): NodeId[] {
  const connected = new Set<NodeId>();
  for (const edge of edges) {
    connected.add(edge.from);
    connected.add(edge.to);
  }
  const orphans: NodeId[] = [];
  for (const id of nodeMap.keys()) if (!connected.has(id)) orphans.push(id);

  return orphans;
}
