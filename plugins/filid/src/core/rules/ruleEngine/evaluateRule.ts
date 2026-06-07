import type { Rule, RuleContext, RuleViolation } from '../../../types/rules.js';

/**
 * 단일 규칙을 단일 노드에 적용한다.
 *
 * @param rule - 적용할 규칙
 * @param context - 규칙 컨텍스트
 * @returns 위반 목록 (없으면 빈 배열)
 */
export function evaluateRule(
  rule: Rule,
  context: RuleContext,
): RuleViolation[] {
  if (!rule.enabled) return [];
  try {
    return rule.check(context);
  } catch {
    return [];
  }
}
