import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkDependencyCycles(context: RuleContext): RuleViolation[] {
  const snapshot = context.snapshot;
  if (!snapshot)
    return [
      {
        ruleId: BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
        severity: 'warning',
        message: 'Dependency-cycle analysis requires a project snapshot.',
        path: context.tree.root,
        certainty: 'indeterminate',
      },
    ];
  const graph = snapshot.dependencyGraph;
  const cycles: RuleViolation[] = graph.cycles.map((cycle) => ({
    ruleId: BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
    severity: 'error' as const,
    message: `Dependency cycle: ${cycle.join(' -> ')}`,
    path: cycle[0] ?? snapshot.projectRoot,
    certainty: 'exact' as const,
  }));
  if (graph.certainty === 'exact') return cycles;
  return [
    {
      ruleId: BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
      severity: 'warning',
      message: `Dependency-cycle analysis is ${graph.certainty}.`,
      path: snapshot.projectRoot,
      certainty: graph.certainty,
    },
    ...cycles,
  ];
}
