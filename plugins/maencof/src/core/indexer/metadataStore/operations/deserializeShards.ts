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
import { isLayerDirPath } from '../../../../types/layer.js';

/**
 * 3-파일 shard(nodes/edges/graph-meta) 를 KnowledgeGraph 로 복원한다.
 * 레이어 밖 경로 노드는 복원 시 정화한다 — 변경 이전 인덱스의 잔존 노드가
 * 재수화(lens 포함)로 그래프에 되돌아오지 못하게 하는 3차 방어선 (R2).
 */
export function deserializeShards(
  nodesArr: SerializedNodes,
  edgesArr: SerializedEdges,
  meta: SerializedGraphMeta,
): KnowledgeGraph {
  const nodes = new Map<NodeId, KnowledgeNode>();
  for (const node of nodesArr)
    if (isLayerDirPath(node.path)) nodes.set(node.id, node);

  const edges = (edgesArr as KnowledgeEdge[]).filter(
    (e) => nodes.has(e.from) && nodes.has(e.to),
  );

  return {
    nodes,
    edges,
    builtAt: meta.builtAt,
    nodeCount: nodes.size,
    edgeCount: edges.length,
  };
}
