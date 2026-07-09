/**
 * @file serializeGraph.ts
 * @description KnowledgeGraph를 직렬화 가능한 형식으로 변환한다.
 */
import type {
  KnowledgeGraph,
  SerializedGraph,
} from '../../../../types/graph.js';

/**
 * KnowledgeGraph를 직렬화 가능한 형식으로 변환한다.
 */
export function serializeGraph(graph: KnowledgeGraph): SerializedGraph {
  return {
    nodes: Array.from(graph.nodes.values()),
    edges: graph.edges,
    builtAt: graph.builtAt,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
  };
}
