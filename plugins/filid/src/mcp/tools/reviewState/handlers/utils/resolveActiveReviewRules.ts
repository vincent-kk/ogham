import type { LoadedReviewRule } from '../../rules/reviewRuleTypes.js';

/**
 * Apply repository replacements and reject duplicate active rule identifiers.
 * @param rules Validated built-in rules in declaration order.
 * @param overrides Validated repository overrides in declaration order.
 * @returns Active rules in built-in-then-override order.
 */
export function resolveActiveReviewRules(
  rules: readonly LoadedReviewRule[],
  overrides: readonly LoadedReviewRule[],
): LoadedReviewRule[] {
  const replaced = new Set(overrides.flatMap((rule) => rule.replaces ?? []));
  const active = [
    ...rules.filter((rule) => !replaced.has(rule.id)),
    ...overrides,
  ];
  const ids = new Set<string>();
  for (const rule of active) {
    if (ids.has(rule.id))
      throw new Error(`Review rules duplicate active id "${rule.id}".`);
    ids.add(rule.id);
  }
  return active;
}
