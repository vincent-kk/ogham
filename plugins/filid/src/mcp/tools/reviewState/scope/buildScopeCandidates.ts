import { RULE_SCOPES } from '../../../../constants/ruleScopes.js';
import type {
  ReviewScopeCategory,
  ReviewScopeViolation,
  ScopeCandidateBuildResult,
} from '../state/reviewStateTypes.js';

const SEVERITY_RANK = { info: 0, warning: 1, error: 2 } as const;

function compareViolation(
  left: ReviewScopeViolation,
  right: ReviewScopeViolation,
): number {
  if (left.path !== right.path) return left.path < right.path ? -1 : 1;
  if (left.ruleId !== right.ruleId) return left.ruleId < right.ruleId ? -1 : 1;
  if (left.message === right.message) return 0;
  return left.message < right.message ? -1 : 1;
}

function categoryForScope(scope: string): ReviewScopeCategory {
  if (scope === RULE_SCOPES.DOCUMENTS || scope === RULE_SCOPES.ENTRY_POINTS)
    return 'contract';
  if (scope === RULE_SCOPES.VERIFICATION) return 'verification';
  return 'structure';
}

/**
 * Deduplicate and sort retained violations into FCA candidates and info rows.
 * @param retained Changed-scope violations in observation order.
 * @param ruleScopeById Rule roster lookup used for candidate scope and category.
 * @returns Stable FCA IDs for findings and unnumbered informational evidence.
 */
export function buildScopeCandidates(
  retained: readonly ReviewScopeViolation[],
  ruleScopeById: ReadonlyMap<string, string>,
): ScopeCandidateBuildResult {
  const deduplicated = new Map<string, ReviewScopeViolation>();
  for (const violation of retained) {
    const key = `${violation.path}\0${violation.ruleId}\0${violation.message}`;
    const existing = deduplicated.get(key);
    if (!existing) deduplicated.set(key, violation);
    else if (
      SEVERITY_RANK[violation.severity] > SEVERITY_RANK[existing.severity]
    )
      deduplicated.set(key, { ...existing, severity: violation.severity });
  }
  const candidates: ScopeCandidateBuildResult['candidates'] = [];
  const informational: ScopeCandidateBuildResult['informational'] = [];
  for (const violation of [...deduplicated.values()].sort(compareViolation)) {
    const scope =
      violation.source === 'verification'
        ? RULE_SCOPES.VERIFICATION
        : (ruleScopeById.get(violation.ruleId) ?? RULE_SCOPES.NODES);
    const base = {
      source: violation.source,
      scope,
      category: categoryForScope(scope),
      path: violation.path,
      rule: violation.ruleId,
      message: violation.message,
      ...(violation.certainty ? { certainty: violation.certainty } : {}),
    };
    if (violation.severity === 'info')
      informational.push({ ...base, severity: 'info' });
    else
      candidates.push({
        id: `FCA-${String(candidates.length + 1).padStart(3, '0')}`,
        ...base,
        severity: violation.severity,
      });
  }
  return { candidates, informational };
}
