/**
 * @file deserializeGraph.ts
 * @description 직렬화된 그래프를 KnowledgeGraph로 복원한다 (legacy index.json 경로).
 */
import type { NodeId } from '../../../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  SerializedGraph,
} from '../../../../types/graph.js';

/**
 * 직렬화된 그래프를 KnowledgeGraph로 복원한다 (legacy index.json 경로).
 */
export function deserializeGraph(data: SerializedGraph): KnowledgeGraph {
  const nodes = new Map<NodeId, KnowledgeNode>();
  for (const node of data.nodes) nodes.set(node.id, node);

  return {
    nodes,
    edges: data.edges as KnowledgeEdge[],
    builtAt: data.builtAt,
    nodeCount: data.nodeCount,
    edgeCount: data.edgeCount,
  };
}
