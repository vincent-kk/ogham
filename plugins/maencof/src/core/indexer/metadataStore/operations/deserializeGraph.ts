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
import { isLayerDirPath } from '../../../../types/layer.js';

/**
 * 직렬화된 그래프를 KnowledgeGraph로 복원한다 (legacy index.json 경로).
 * 레이어 밖 경로 노드는 복원 시 정화한다 — 변경 이전 인덱스의 잔존 노드가
 * 재수화로 그래프에 되돌아오지 못하게 하는 3차 방어선 (R2).
 */
export function deserializeGraph(data: SerializedGraph): KnowledgeGraph {
  const nodes = new Map<NodeId, KnowledgeNode>();
  for (const node of data.nodes)
    if (isLayerDirPath(node.path)) nodes.set(node.id, node);

  const edges = (data.edges as KnowledgeEdge[]).filter(
    (e) => nodes.has(e.from) && nodes.has(e.to),
  );

  return {
    nodes,
    edges,
    builtAt: data.builtAt,
    nodeCount: nodes.size,
    edgeCount: edges.length,
  };
}
