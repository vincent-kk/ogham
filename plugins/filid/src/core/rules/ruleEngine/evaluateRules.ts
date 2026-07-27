import type { FractalTree, ProjectSnapshot } from '../../../types/fractal.js';
import type {
  Rule,
  RuleContext,
  RuleEvaluationOptions,
  RuleEvaluationResult,
  RuleViolation,
} from '../../../types/rules.js';

import { evaluateRule } from './evaluateRule.js';
import { loadBuiltinRules } from './loadBuiltinRules.js';

function isProjectSnapshot(
  input: ProjectSnapshot | FractalTree,
): input is ProjectSnapshot {
  return 'tree' in input && 'dependencyGraph' in input;
}

export function evaluateRules(
  input: ProjectSnapshot | FractalTree,
  rules?: Rule[],
  options?: RuleEvaluationOptions,
): RuleEvaluationResult {
  const start = Date.now();
  let snapshot: ProjectSnapshot | undefined;
  let tree: FractalTree;
  if (isProjectSnapshot(input)) {
    snapshot = input;
    tree = input.tree;
  } else tree = input;
  const selectedRules = (rules ?? loadBuiltinRules()).filter(
    (rule) =>
      !options?.scopes || options.scopes.includes(rule.scope ?? 'nodes'),
  );
  const violations: RuleViolation[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const rule of selectedRules) {
    if (!rule.enabled) {
      skipped +=
        rule.granularity === 'project' ? 1 : Math.max(tree.totalNodes, 1);
      continue;
    }
    const nodes =
      rule.granularity === 'project'
        ? [tree.nodes.get(tree.root) ?? tree.nodes.values().next().value]
        : [...tree.nodes.values()];
    for (const node of nodes) {
      if (!node) {
        skipped++;
        continue;
      }
      const context: RuleContext = {
        node,
        tree,
        snapshot,
        scanOptions: options,
      };
      const findings = evaluateRule(rule, context);
      if (findings.length === 0) passed++;
      else failed++;
      violations.push(...findings);
    }
  }

  return {
    violations,
    passed,
    failed,
    skipped,
    duration: Date.now() - start,
  };
}
