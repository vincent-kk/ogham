import type {
  DependencyGraph,
  FractalTree,
} from '../../../../types/fractal.js';
import type { RuleViolation } from '../../../../types/rules.js';

export function validateDependencies(
  input: DependencyGraph | FractalTree,
): RuleViolation[] {
  if ('nodes' in input)
    return [
      {
        ruleId: 'circular-dependency',
        severity: 'warning',
        message:
          'Dependency analysis is indeterminate because a legacy tree contains no import-edge evidence.',
        path: input.root,
        suggestion:
          'Provide a ProjectSnapshot dependency graph before claiming the dependency DAG is valid.',
        certainty: 'indeterminate',
      },
    ];

  const violations: RuleViolation[] = input.cycles.map((cycle) => ({
    ruleId: 'circular-dependency',
    severity: 'error',
    message: `Circular dependency detected: ${cycle.join(' → ')}`,
    path: cycle[0] ?? input.nodePaths[0] ?? '',
    suggestion: 'Extract shared logic or invert an edge to restore the DAG.',
  }));

  if (input.certainty !== 'exact')
    violations.push({
      ruleId: 'circular-dependency',
      severity: 'warning',
      message: `Dependency cycle analysis is ${input.certainty}; unresolved evidence may affect the result.`,
      path: input.nodePaths[0] ?? '',
      suggestion: 'Resolve unsupported or indeterminate dependency evidence.',
      certainty: input.certainty,
    });

  return violations;
}
