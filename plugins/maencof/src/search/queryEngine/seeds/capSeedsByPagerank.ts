/**
 * @file capSeedsByPagerank.ts
 * @description 시드 후보가 상한을 초과하면 pagerank 상위 cap 개로 줄인다 (동률은 id 사전순으로 결정적).
 * 허브 태그·대형 폴더의 시드 폭발을 억제한다. 상한 이하이면 원본을 그대로 반환한다.
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../../types/graph.js';

export function capSeedsByPagerank(
  graph: KnowledgeGraph,
  ids: NodeId[],
  cap: number,
): NodeId[] {
  if (ids.length <= cap) return ids;
  return ids
    .map((id) => graph.nodes.get(id))
    .filter((n): n is KnowledgeNode => n !== undefined)
    .sort((a, b) => {
      const pa = a.pagerank ?? 0;
      const pb = b.pagerank ?? 0;
      if (pb !== pa) return pb - pa;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .slice(0, cap)
    .map((n) => n.id);
}
