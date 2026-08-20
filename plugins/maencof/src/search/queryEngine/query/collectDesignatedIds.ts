/**
 * @file collectDesignatedIds.ts
 * @description 시드 지목(R8) — 한 시드의 어휘 매칭 후보(budget 캡 이전)가 한 클러스터
 * 안에서 정확히 1개 노드일 때 그 노드를 지목으로 모은다. 여러 멤버와 매칭되는 주제어
 * 시드는 지목을 만들지 않아 증류본 승계를 보존한다. 캡 이후 채택 집합으로 판정하면
 * 캡 경계의 광범위 주제어가 유일 지목으로 오인된다. clusterKey 없는 노드는 대상 아님.
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';

/**
 * @param graph - 지식 그래프 (clusterKey 조회용)
 * @param seedMatches - 시드별 캡 이전 어휘 매칭 후보 집합 (resolveSeedNodes.seedMatches)
 * @returns 지목된 노드 ID 집합 — collapse 대표 선정의 최우선 후보
 */
export function collectDesignatedIds(
  graph: KnowledgeGraph,
  seedMatches: ReadonlySet<NodeId>[],
): Set<NodeId> {
  const designated = new Set<NodeId>();
  for (const matched of seedMatches) {
    // 클러스터별 유일 매칭 판정 — 두 번째 매칭이 나타나면 null 로 강등
    const soleByCluster = new Map<string, NodeId | null>();
    for (const id of matched) {
      const key = graph.nodes.get(id)?.clusterKey;
      if (!key) continue;
      soleByCluster.set(key, soleByCluster.has(key) ? null : id);
    }
    for (const id of soleByCluster.values()) if (id) designated.add(id);
  }
  return designated;
}
