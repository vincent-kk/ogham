import type { DriftItem } from '../../../types/drift.js';
import type { FractalTree } from '../../../types/fractal.js';
import type { RuleEvaluationResult } from '../../../types/rules.js';
import { RULE_TO_ACTION, SEVERITY_ORDER } from '../../../constants/drift-mappings.js';
import { calculateSeverity } from './calculate-severity.js';

/**
 * 규칙 평가 결과를 DriftItem 목록으로 변환한다.
 *
 * @param tree - 참조할 프랙탈 트리
 * @param rules - 규칙 평가 결과
 * @returns DriftItem 배열 (심각도 내림차순 정렬)
 */
export function compareCurrent(
  _tree: FractalTree,
  rules: RuleEvaluationResult,
): DriftItem[] {
  const items: DriftItem[] = rules.violations.map((violation) => {
    const severity = calculateSeverity(violation);
    const action = RULE_TO_ACTION[violation.ruleId] ?? 'reclassify';
    return {
      path: violation.path,
      rule: violation.ruleId,
      expected: violation.suggestion ?? 'Compliant with rule',
      actual: violation.message,
      severity,
      suggestedAction: action,
    };
  });

  // 심각도 내림차순 정렬
  return items.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}
