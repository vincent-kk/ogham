/**
 * @file deserializeShards.ts
 * @description 3-파일 shard(nodes/edges/graph-meta) 를 KnowledgeGraph 로 복원한다.
 */
import type { NodeId } from '../../../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  SerializedEdges,
  SerializedGraphMeta,
  SerializedNodes,
} from '../../../../types/graph.js';

/**
 * 3-파일 shard(nodes/edges/graph-meta) 를 KnowledgeGraph 로 복원한다.
 */
export function deserializeShards(
  nodesArr: SerializedNodes,
  edgesArr: SerializedEdges,
  meta: SerializedGraphMeta,
): KnowledgeGraph {
  const nodes = new Map<NodeId, KnowledgeNode>();
  for (const node of nodesArr) nodes.set(node.id, node);

  return {
    nodes,
    edges: edgesArr as KnowledgeEdge[],
    builtAt: meta.builtAt,
    nodeCount: meta.nodeCount,
    edgeCount: meta.edgeCount,
  };
}
