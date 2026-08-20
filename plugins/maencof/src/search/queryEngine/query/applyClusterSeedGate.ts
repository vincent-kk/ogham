/**
 * @file applyClusterSeedGate.ts
 * @description 클러스터 앵커 격리 게이트 (R11) — sub_layer: clusterseed 노드는
 * 시드로 특정된 경우에만 결과에 남고, 확산만으로는 수록되지 않는다. collapse 의
 * 전역 대표 후보 자격에는 관여하지 않는다(비매칭 앵커도 대표 승계는 가능).
 */
import type { NodeId } from '../../../types/common.js';
import type { ActivationResult, KnowledgeGraph } from '../../../types/graph.js';

/**
 * @param results - SA 활성 결과 (collapse 전)
 * @param graph - 지식 그래프 (subLayer 조회용)
 * @param seedTouchedIds - 시드로 특정된 노드 id (키워드 캡 이전 매칭 ∪ path 채택)
 * @returns 특정되지 않은 clusterseed 노드를 제외한 결과
 */
export function applyClusterSeedGate(
  results: ActivationResult[],
  graph: KnowledgeGraph,
  seedTouchedIds: ReadonlySet<NodeId>,
): ActivationResult[] {
  return results.filter(
    (r) =>
      graph.nodes.get(r.nodeId)?.subLayer !== 'clusterseed' ||
      seedTouchedIds.has(r.nodeId),
  );
}
