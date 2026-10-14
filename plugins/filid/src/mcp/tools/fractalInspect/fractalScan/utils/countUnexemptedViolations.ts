import type { RuleViolation } from '../../../../../types/rules.js';

/**
 * Counts the findings that still stand after config exemptions.
 * @param violations Rule findings including exemption info findings.
 * @returns Number of findings without `exemptedBy`.
 */
export function countUnexemptedViolations(
  violations: readonly RuleViolation[],
): number {
  return violations.filter((violation) => !violation.exemptedBy).length;
}
