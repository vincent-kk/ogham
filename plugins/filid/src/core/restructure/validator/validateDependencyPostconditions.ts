import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import type { ProjectSnapshot, UnknownFile } from '../../../types/fractal.js';
import type {
  PlanValidationFinding,
  RestructurePlan,
} from '../../../types/restructure.js';
import { canonicalizeDirectedGraph } from '../../analysis/dependencyGraph/cycles/canonicalizeDirectedGraph.js';
import { findStronglyConnectedComponents } from '../../analysis/dependencyGraph/cycles/findStronglyConnectedComponents.js';
import { toDirectedPairs } from '../../analysis/dependencyGraph/cycles/toDirectedPairs.js';
import { relocateThroughMoves } from '../imports/relocateThroughMoves.js';

import { cycleIdentity } from './cycleIdentity.js';

/**
 * Check the post-execution graph for cycles and for unknown files the plan's conclusions need.
 *
 * Every cycle is reported. One whose strongly connected component, identified
 * by member owners rather than by its representative route, matches a
 * plan-time component relocated through the plan's moves is `preexisting`;
 * any other is a finding. "No cycle" — and the import requirements' "every
 * reference" — is an absence, so a related unknown file makes it a finding;
 * unrelated ones do not.
 * @param snapshot Post-execution snapshot.
 * @param plan The executed plan, with its baseline.
 * @param relevantUnknownFiles Unknown files related to the plan's units.
 * @returns New cycles and the unknown-file finding, and the pre-existing cycles.
 */
export function validateDependencyPostconditions(
  snapshot: ProjectSnapshot,
  plan: RestructurePlan,
  relevantUnknownFiles: readonly UnknownFile[],
): { findings: PlanValidationFinding[]; preexisting: PlanValidationFinding[] } {
  const baseline = new Set(
    plan.baseline.cycles.map((component) =>
      cycleIdentity(
        component.map((path) => relocateThroughMoves(path, plan.moves)),
      ),
    ),
  );
  const pairs = toDirectedPairs(snapshot.dependencyGraph);
  const graph = canonicalizeDirectedGraph(pairs.nodePaths, pairs.edges);
  const componentByNode = new Map<string, string[]>();
  for (const component of findStronglyConnectedComponents(graph))
    if (component.length > 1)
      for (const node of component) componentByNode.set(node, component);

  const result = {
    findings: [] as PlanValidationFinding[],
    preexisting: [] as PlanValidationFinding[],
  };
  for (const cycle of snapshot.dependencyGraph.cycles)
    (baseline.has(
      cycleIdentity(componentByNode.get(cycle[0] ?? '') ?? cycle),
    )
      ? result.preexisting
      : result.findings
    ).push({
      code: RESTRUCTURE_VALIDATION_CODES.DEPENDENCY_CYCLE,
      message: `The dependency graph after execution has a cycle: ${cycle.join(' -> ')}.`,
      nextAction:
        "If the plan's moves or import edits closed the cycle, fix the imports that close it; if it existed before the plan, report it to the user as pre-existing. Then run postcondition again.",
      path: cycle[0] ?? snapshot.projectRoot,
    });
  if (relevantUnknownFiles.length > 0)
    result.findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.DEPENDENCY_GRAPH_INDETERMINATE,
      message: `${relevantUnknownFiles.length} file(s) related to the plan have unconfirmed references after execution, so the DAG and the import edits cannot be confirmed: ${relevantUnknownFiles.map(({ path, causes }) => `${path} (${causes.join(', ')})`).join('; ')}.`,
      nextAction:
        'Follow the nextAction of each diagnostic on those files in this response, then run postcondition again. Until it passes, report the restructure as unverified, never as complete.',
      path: snapshot.projectRoot,
    });
  return result;
}
