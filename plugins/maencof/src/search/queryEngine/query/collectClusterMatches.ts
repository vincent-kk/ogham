/**
 * @file collectClusterMatches.ts
 * @description R10 트리거 — 최종 결과에 남은 클러스터 중 시드 어휘 매칭(캡 이전)이
 * 닿은 키만 골라, 키별 매칭 멤버 id 를 모은다. 확산으로만 결과에 든 클러스터는
 * 담기지 않는다 — "평소에는 대표만, 언급 시에만 내부" 의 판별 지점.
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';

/**
 * @param graph - 지식 그래프 (clusterKey 조회용)
 * @param seedMatches - 시드별 캡 이전 어휘 매칭 집합 (resolveSeedNodes.seedMatches)
 * @param finalKeys - 절단 후 결과에 존재하는 clusterKey 집합
 * @returns 시드 접촉 클러스터 → 매칭 멤버 id (정렬, dedup). 접촉 없으면 빈 객체.
 */
export function collectClusterMatches(
  graph: KnowledgeGraph,
  seedMatches: ReadonlySet<NodeId>[],
  finalKeys: ReadonlySet<string>,
): Record<string, NodeId[]> {
  const byKey = new Map<string, Set<NodeId>>();
  for (const matched of seedMatches)
    for (const id of matched) {
      const key = graph.nodes.get(id)?.clusterKey;
      if (!key || !finalKeys.has(key)) continue;
      let set = byKey.get(key);
      if (!set) {
        set = new Set();
        byKey.set(key, set);
      }
      set.add(id);
    }
  return Object.fromEntries(
    [...byKey].map(([key, ids]) => [key, [...ids].sort()]),
  );
}
