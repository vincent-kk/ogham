import { samePath } from '@ogham/cross-platform';

import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkPureFunctionIsolation(
  context: RuleContext,
): RuleViolation[] {
  const { node, snapshot, tree } = context;
  if (node.type !== 'pure-function') return [];
  if (!snapshot)
    return [
      {
        ruleId: BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION,
        severity: 'warning',
        message: `Isolation evidence is unavailable for pure-function node "${node.name}".`,
        path: node.path,
        certainty: 'indeterminate',
      },
    ];
  const violations: RuleViolation[] = snapshot.dependencyGraph.edges
    .filter((edge) => samePath(edge.fromFractalPath, node.path))
    .flatMap((edge) => {
      const target = [...tree.nodes.values()].find((candidate) =>
        samePath(candidate.path, edge.toFractalPath),
      );
      if (!target || (target.type !== 'fractal' && target.type !== 'hybrid'))
        return [];
      return [
        {
          ruleId: BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION,
          severity: 'error' as const,
          message: `Pure-function node "${node.name}" depends on fractal module "${target.name}".`,
          path: node.path,
          suggestion: `Pass the dependency into "${node.name}" or place it inside an owning fractal.`,
        },
      ];
    });

  if (snapshot.dependencyGraph.certainty !== 'exact')
    violations.push({
      ruleId: BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION,
      severity: 'warning',
      message: `Dependency analysis is ${snapshot.dependencyGraph.certainty}; isolation cannot be proven for pure-function node "${node.name}".`,
      path: node.path,
      suggestion:
        'Resolve incomplete dependency evidence before claiming pure-function isolation.',
      certainty: snapshot.dependencyGraph.certainty,
    });

  return violations;
}
