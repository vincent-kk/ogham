/**
 * @file crossLayer.ts
 * @description 허브 노드(`hub: true`) → 태그 겹침 노드로 CROSS_LAYER 엣지 생성.
 */
import { MAX_CROSS_LAYER_EDGES_PER_NODE } from '../../../../constants/thresholds.js';
import type { KnowledgeEdge, KnowledgeNode } from '../../../../types/graph.js';

/**
 * 허브 노드에서 태그가 겹치는 노드로 CROSS_LAYER 엣지를 생성한다.
 *
 * 허브는 레이어와 직교하는 속성이므로 대상은 레이어로 거르지 않고 태그 겹침으로만
 * 정한다. 노드당 MAX_CROSS_LAYER_EDGES_PER_NODE 상한을 적용하며, 상한에 걸릴 때
 * 어떤 대상이 남는지가 입력 배열 순서에 좌우되지 않도록 id 순으로 자른다.
 *
 * @param nodes - 전체 지식 노드 목록
 * @returns 양방향 CROSS_LAYER 엣지 목록 (허브가 없으면 빈 배열)
 */
export function buildCrossLayerEdges(nodes: KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  const hubNodes = nodes.filter((n) => n.hub === true);
  if (hubNodes.length === 0) return edges;

  const sorted = [...nodes].sort((a, b) => (a.id < b.id ? -1 : 1));

  for (const hub of hubNodes) {
    const hubTags = new Set(hub.tags);
    let edgeCount = 0;

    for (const candidate of sorted) {
      if (edgeCount >= MAX_CROSS_LAYER_EDGES_PER_NODE) break;
      if (candidate.id === hub.id) continue;
      if (!candidate.tags.some((tag) => hubTags.has(tag))) continue;

      edges.push({
        from: hub.id,
        to: candidate.id,
        type: 'CROSS_LAYER',
        weight: 1.0,
      });
      edges.push({
        from: candidate.id,
        to: hub.id,
        type: 'CROSS_LAYER',
        weight: 1.0,
      });
      edgeCount++;
    }
  }

  return edges;
}
