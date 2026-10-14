import type { ReviewScopeViolation } from '../state/reviewStateTypes.js';

/** Changed-scope violation counts that drive the per-axis statuses. */
export interface RetainedViolationCounts {
  /** Structure findings above info severity. */
  structure: number;
  /** Verification findings above info severity. */
  verification: number;
}

/**
 * Counts retained violations per axis, leaving info observations (including
 * config exemptions) out so a status never reports violations without a candidate.
 * @param retained Changed-scope violations in observation order.
 * @returns Structure and verification counts of non-info findings.
 */
export function countRetainedViolations(
  retained: readonly ReviewScopeViolation[],
): RetainedViolationCounts {
  const counts: RetainedViolationCounts = { structure: 0, verification: 0 };
  for (const violation of retained) {
    if (violation.severity === 'info') continue;
    if (violation.source === 'structure') counts.structure += 1;
    else counts.verification += 1;
  }
  return counts;
}
