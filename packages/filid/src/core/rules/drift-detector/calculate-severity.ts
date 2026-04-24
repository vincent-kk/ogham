import type { DriftSeverity } from '../../../types/drift.js';
import type { RuleViolation } from '../../../types/rules.js';
import { RULE_TO_SEVERITY } from '../../../constants/drift-mappings.js';

/**
 * RuleViolation의 심각도를 DriftSeverity로 변환한다.
 *
 * @param violation - 변환할 규칙 위반 항목
 * @returns 대응하는 DriftSeverity
 */
export function calculateSeverity(violation: RuleViolation): DriftSeverity {
  const mapped = RULE_TO_SEVERITY[violation.ruleId];
  if (mapped) return mapped;

  // severity 기반 fallback
  switch (violation.severity) {
    case 'error':
      return 'high';
    case 'warning':
      return 'medium';
    case 'info':
      return 'low';
    default:
      return 'low';
  }
}
