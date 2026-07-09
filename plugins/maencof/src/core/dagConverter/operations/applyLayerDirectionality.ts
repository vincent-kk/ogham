/**
 * @file applyLayerDirectionality.ts
 * @description 레이어 기반 방향성 보정 — 역방향 LINK 엣지를 약화.
 */
import { CYCLE_WEIGHT } from '../../../constants/weights.js';
import { Layer } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';

/**
 * 레이어 기반 방향성 보정.
 * Layer 값이 높은 노드 → 낮은 노드 방향이 올바른 방향.
 * 역방향 LINK 엣지(낮은 Layer → 높은 Layer)를 약화.
 */
export function applyLayerDirectionality(
  graph: KnowledgeGraph,
): KnowledgeGraph {
  const newEdges = graph.edges.map((edge) => {
    if (edge.type !== 'LINK') return edge;
    const fromNode = graph.nodes.get(edge.from);
    const toNode = graph.nodes.get(edge.to);
    if (!fromNode || !toNode) return edge;
    // Layer 1 → 높은 Layer로의 아웃바운드 링크는 설계 위반 → 약화
    if (fromNode.layer === Layer.L1_CORE && toNode.layer > Layer.L1_CORE)
      return { ...edge, weight: CYCLE_WEIGHT };

    return edge;
  });

  return { ...graph, edges: newEdges };
}
