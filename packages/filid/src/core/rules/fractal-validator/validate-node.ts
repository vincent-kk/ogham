import type { FractalNode } from '../../../types/fractal.js';
import type {
  Rule,
  RuleContext,
  RuleViolation,
} from '../../../types/rules.js';

import { loadBuiltinRules } from '../rule-engine/rule-engine.js';

/**
 * 단일 노드를 특정 규칙으로 검증한다.
 *
 * @param node - 검증할 노드
 * @param context - 노드가 속한 트리와 설정을 포함한 컨텍스트
 * @param rule - 적용할 규칙 (미제공 시 모든 기본 규칙 적용)
 * @returns 해당 노드에서 발생한 위반 목록
 */
export function validateNode(
  _node: FractalNode,
  context: RuleContext,
  rule?: Rule,
): RuleViolation[] {
  if (rule) {
    return rule.check(context);
  }

  const rules = loadBuiltinRules();
  const violations: RuleViolation[] = [];
  for (const r of rules) {
    if (r.enabled) {
      violations.push(...r.check(context));
    }
  }
  return violations;
}
