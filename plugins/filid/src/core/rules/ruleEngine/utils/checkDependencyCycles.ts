import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import { toProjectRelativePath } from '../../../../lib/toProjectRelativePath.js';
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
        suggestion:
          'Evaluate through fractal_inspect action "validate" or "scan", which build the project snapshot this rule needs.',
      },
    ];
  const graph = snapshot.dependencyGraph;
  const cycles: RuleViolation[] = graph.cycles.map((cycle) => ({
    ruleId: BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
    severity: 'error' as const,
    message: `Dependency cycle: ${cycle.map((path) => toProjectRelativePath(snapshot.projectRoot, path)).join(' -> ')}`,
    path: cycle[0] ?? snapshot.projectRoot,
    certainty: 'exact' as const,
    suggestion:
      'Break the cycle: move what both sides share into a unit they both import, or invert one edge behind an interface.',
  }));
  if (graph.certainty === 'exact') return cycles;
  return [
    {
      ruleId: BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
      severity: 'warning',
      message: `Dependency-cycle analysis is ${graph.certainty}.`,
      path: snapshot.projectRoot,
      certainty: graph.certainty,
      suggestion:
        "Follow each dependency diagnostic's nextAction (unresolved, uncertain or unowned references, or a missing adapter); the DAG is unproven until the graph is exact.",
    },
    ...cycles,
  ];
}
