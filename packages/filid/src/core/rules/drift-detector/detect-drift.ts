import type { DetectDriftOptions, DriftItem, DriftResult, DriftSeverity } from '../../../types/drift.js';
import type { FractalTree } from '../../../types/fractal.js';
import type { RuleViolation } from '../../../types/rules.js';
import { RULE_TO_ACTION, SEVERITY_ORDER } from '../../../constants/drift-mappings.js';
import { calculateSeverity } from './calculate-severity.js';

/**
 * FractalTree를 분석하여 구조 이격을 감지하고 DriftResult를 반환한다.
 *
 * @param tree - 이격을 감지할 프랙탈 트리
 * @param violations - 사전에 계산된 규칙 위반 목록 (미제공 시 validateStructure 실행)
 * @param options - 감지 옵션 (criticalOnly, generatePlan)
 * @returns 이격 감지 결과 (항목 목록, 심각도별 집계, 타임스탬프)
 */
export function detectDrift(
  _tree: FractalTree,
  violations: RuleViolation[],
  options?: DetectDriftOptions,
): DriftResult {
  let items = violations.map((violation) => {
    const severity = calculateSeverity(violation);
    const action = RULE_TO_ACTION[violation.ruleId] ?? 'reclassify';

    return {
      path: violation.path,
      rule: violation.ruleId,
      expected: violation.suggestion ?? 'Compliant with rule',
      actual: violation.message,
      severity,
      suggestedAction: action,
    } satisfies DriftItem;
  });

  // 심각도 내림차순 정렬
  items = items.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  if (options?.criticalOnly) {
    items = items.filter((item) => item.severity === 'critical');
  }

  const bySeverity: Record<DriftSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const item of items) {
    bySeverity[item.severity]++;
  }

  return {
    items,
    totalDrifts: items.length,
    bySeverity,
    scanTimestamp: new Date().toISOString(),
  };
}
