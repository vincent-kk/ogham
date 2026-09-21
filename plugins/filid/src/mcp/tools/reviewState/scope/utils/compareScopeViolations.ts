import type { ReviewScopeViolation } from '../../state/reviewStateTypes.js';

/**
 * Order two scope violations by path, then rule, then message.
 * @param left First violation.
 * @param right Second violation.
 * @returns Negative, zero or positive, as `Array.prototype.sort` expects.
 */
export function compareScopeViolations(
  left: ReviewScopeViolation,
  right: ReviewScopeViolation,
): number {
  if (left.path !== right.path) return left.path < right.path ? -1 : 1;
  if (left.ruleId !== right.ruleId) return left.ruleId < right.ruleId ? -1 : 1;
  if (left.message === right.message) return 0;
  return left.message < right.message ? -1 : 1;
}
