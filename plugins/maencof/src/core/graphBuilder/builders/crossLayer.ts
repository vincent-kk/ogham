/**
 * @file crossLayer.ts
 * @description L5-Boundary 노드 → connected_layers 내 태그 겹침 노드로 CROSS_LAYER 엣지 생성.
 */
import { MAX_CROSS_LAYER_EDGES_PER_NODE } from '../../../constants/thresholds.js';
import type { KnowledgeEdge, KnowledgeNode } from '../../../types/graph.js';

/**
 * L5-Boundary 노드에서 connected_layers 내 노드로 CROSS_LAYER 엣지 생성.
 * 태그 겹침 기반으로 바운딩하고 MAX_CROSS_LAYER_EDGES_PER_NODE 캡 적용.
 */
export function buildCrossLayerEdges(nodes: KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];

  const boundaryNodes = nodes.filter(
    (n) =>
      n.subLayer === 'boundary' &&
      n.connectedLayers &&
      n.connectedLayers.length > 0,
  );

  if (boundaryNodes.length === 0) return edges;

  const layerMap = new Map<number, KnowledgeNode[]>();
  for (const node of nodes) {
    const layer = node.layer as number;
    if (!layerMap.has(layer)) {
      layerMap.set(layer, []);
    }
    layerMap.get(layer)!.push(node);
  }

  for (const boundary of boundaryNodes) {
    const boundaryTags = new Set(boundary.tags);
    let edgeCount = 0;

    for (const targetLayer of boundary.connectedLayers!) {
      const candidates = layerMap.get(targetLayer) ?? [];
      for (const candidate of candidates) {
        if (candidate.id === boundary.id) continue;
        if (edgeCount >= MAX_CROSS_LAYER_EDGES_PER_NODE) break;

        const hasOverlap = candidate.tags.some((tag) => boundaryTags.has(tag));
        if (!hasOverlap) continue;

        edges.push({
          from: boundary.id,
          to: candidate.id,
          type: 'CROSS_LAYER',
          weight: 1.0,
        });
        edges.push({
          from: candidate.id,
          to: boundary.id,
          type: 'CROSS_LAYER',
          weight: 1.0,
        });
        edgeCount++;
      }
      if (edgeCount >= MAX_CROSS_LAYER_EDGES_PER_NODE) break;
    }
  }

  return edges;
}
