import type {
  DriftItem,
  SyncAction,
  SyncPlan,
  SyncPlanAction,
} from '../../../types/drift.js';
import { SEVERITY_ORDER } from '../../../constants/drift-mappings.js';
import { computeOverallRisk } from './utils/compute-overall-risk.js';
import { isReversible } from './utils/is-reversible.js';

/**
 * DriftItem 목록을 분석하여 실행 가능한 SyncPlan을 생성한다.
 *
 * @param drifts - 보정할 이격 항목 목록
 * @returns 실행 계획 (액션 목록, 예상 변경 수, 위험도)
 */
export function generateSyncPlan(drifts: DriftItem[]): SyncPlan {
  const ACTION_ORDER: Record<SyncAction, number> = {
    move: 0,
    rename: 1,
    'create-index': 2,
    'create-main': 3,
    reclassify: 4,
    split: 5,
    merge: 6,
  };

  const actions: SyncPlanAction[] = drifts.map(
    (item): SyncPlanAction => ({
      action: item.suggestedAction,
      source: item.path,
      reason: item.actual,
      riskLevel: item.severity,
      reversible: isReversible(item.suggestedAction),
    }),
  );

  // 정렬: 심각도 → reversible 우선 → action 순서
  actions.sort((a, b) => {
    const severityDiff =
      SEVERITY_ORDER[a.riskLevel] - SEVERITY_ORDER[b.riskLevel];
    if (severityDiff !== 0) return severityDiff;
    // reversible 먼저
    if (a.reversible !== b.reversible) return a.reversible ? -1 : 1;
    return ACTION_ORDER[a.action] - ACTION_ORDER[b.action];
  });

  const overallRisk = computeOverallRisk(drifts);

  return {
    actions,
    estimatedChanges: actions.length,
    riskLevel: overallRisk,
  };
}
