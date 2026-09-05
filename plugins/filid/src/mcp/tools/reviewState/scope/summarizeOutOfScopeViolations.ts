import type {
  ReviewOutOfScopeSummary,
  ReviewScopeViolation,
} from '../state/reviewStateTypes.js';

function compareSummary(
  left: ReviewOutOfScopeSummary,
  right: ReviewOutOfScopeSummary,
): number {
  if (left.source !== right.source) return left.source < right.source ? -1 : 1;
  if (left.rule !== right.rule) return left.rule < right.rule ? -1 : 1;
  return left.severity.localeCompare(right.severity);
}

/**
 * Count excluded finding rows by source, rule, and severity.
 * @param violations Out-of-scope violations in observation order.
 * @returns Stable summaries sorted by source and rule.
 */
export function summarizeOutOfScopeViolations(
  violations: readonly ReviewScopeViolation[],
): ReviewOutOfScopeSummary[] {
  const summaries = new Map<string, ReviewOutOfScopeSummary>();
  for (const violation of violations) {
    const key = `${violation.source}\0${violation.ruleId}\0${violation.severity}`;
    const existing = summaries.get(key);
    summaries.set(key, {
      source: violation.source,
      rule: violation.ruleId,
      severity: violation.severity,
      count: (existing?.count ?? 0) + 1,
    });
  }
  return [...summaries.values()].sort(compareSummary);
}
