import { BUILTIN_RULE_IDS } from '../../../../constants/builtin-rule-ids.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkPureFunctionIsolation(
  context: RuleContext,
): RuleViolation[] {
  const { node, tree } = context;
  if (node.type !== 'pure-function') return [];

  // metadata에 dependencies가 있으면 확인
  const deps = node.metadata['dependencies'] as string[] | undefined;
  if (!deps || deps.length === 0) return [];

  const violations: RuleViolation[] = [];

  for (const dep of deps) {
    // 의존 대상이 트리에 있고 fractal 타입이면 위반
    const depNode = tree.nodes.get(dep);
    if (
      depNode &&
      (depNode.type === 'fractal' || depNode.type === 'hybrid')
    ) {
      violations.push({
        ruleId: BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION,
        severity: 'error',
        message: `Pure-function node "${node.name}" depends on fractal module "${depNode.name}".`,
        path: node.path,
        suggestion: `Move the dependency under "${depNode.name}" as an organ node or remove the dependency.`,
      });
    }
  }

  return violations;
}
