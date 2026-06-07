import type { Rule } from '../../../types/rules.js';

/**
 * 활성화된 규칙만 필터링하여 반환한다.
 *
 * @param rules - 전체 규칙 목록
 * @returns enabled가 true인 규칙 목록
 */
export function getActiveRules(rules: Rule[]): Rule[] {
  return rules.filter((r) => r.enabled);
}
