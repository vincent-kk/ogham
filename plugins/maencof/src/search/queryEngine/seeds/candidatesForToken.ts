/**
 * @file candidatesForToken.ts
 * @description 단일 토큰의 후보 노드 집합을 반환한다.
 * invertedIndex 존재 시 term prefix 매칭, 없으면 title/tag substring 폴백.
 * 집합 크기는 시드 IDF 의 df 분모로도 쓰인다 (후보 의미론과 동일 분모).
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';

export function candidatesForToken(
  graph: KnowledgeGraph,
  token: string,
): Set<NodeId> {
  const ids = new Set<NodeId>();
  if (graph.invertedIndex)
    for (const [term, nodeIds] of graph.invertedIndex) {
      if (term.startsWith(token)) for (const id of nodeIds) ids.add(id);
    }
  else
    for (const [id, node] of graph.nodes) {
      const titleMatch = node.title.toLowerCase().includes(token);
      const tagMatch = node.tags.some((tag) =>
        tag.toLowerCase().includes(token),
      );
      if (titleMatch || tagMatch) ids.add(id);
    }

  return ids;
}
