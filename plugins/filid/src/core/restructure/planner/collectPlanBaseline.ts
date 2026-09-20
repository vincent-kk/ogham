import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import { RULE_SCOPES } from '../../../constants/ruleScopes.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { PlanBaseline } from '../../../types/restructure.js';
import { canonicalizeDirectedGraph } from '../../analysis/dependencyGraph/cycles/canonicalizeDirectedGraph.js';
import { findStronglyConnectedComponents } from '../../analysis/dependencyGraph/cycles/findStronglyConnectedComponents.js';
import { toDirectedPairs } from '../../analysis/dependencyGraph/cycles/toDirectedPairs.js';
import { evaluateRules } from '../../rules/index.js';

/**
 * Record what the plan-time snapshot already violates, for postcondition to compare.
 * @param snapshot Plan-time snapshot.
 * @returns The node-path sets of its multi-node strongly connected components,
 *   and the identity (rule, importing file, loaded file) of each import-boundary
 *   violation; certainty warnings carry no identity and are left out.
 */
export function collectPlanBaseline(snapshot: ProjectSnapshot): PlanBaseline {
  const pairs = toDirectedPairs(snapshot.dependencyGraph);
  const graph = canonicalizeDirectedGraph(pairs.nodePaths, pairs.edges);
  return {
    cycles: findStronglyConnectedComponents(graph).filter(
      (component) => component.length > 1,
    ),
    boundaryViolations: evaluateRules(snapshot, undefined, {
      scopes: [RULE_SCOPES.BOUNDARIES],
    }).violations.flatMap(({ ruleId, path, importedPath }) =>
      ruleId === BUILTIN_RULE_IDS.EXTERNAL_IMPORT_BOUNDARY && importedPath
        ? [{ ruleId, consumerPath: path, importedPath }]
        : [],
    ),
  };
}
