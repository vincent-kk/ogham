import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { PlanValidationFinding } from '../../../types/restructure.js';

export function validateDependencyPostconditions(
  snapshot: ProjectSnapshot,
): PlanValidationFinding[] {
  const findings: PlanValidationFinding[] = snapshot.dependencyGraph.cycles.map(
    (cycle) => ({
      code: RESTRUCTURE_VALIDATION_CODES.DEPENDENCY_CYCLE,
      message: `The dependency graph after execution has a cycle: ${cycle.join(' -> ')}.`,
      nextAction:
        "If the plan's moves or import edits closed the cycle, fix the imports that close it; if it existed before the plan, report it to the user as pre-existing. Then run postcondition again.",
      path: cycle[0] ?? snapshot.projectRoot,
    }),
  );
  if (snapshot.dependencyGraph.certainty !== ANALYSIS_CERTAINTIES.EXACT)
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.DEPENDENCY_GRAPH_INDETERMINATE,
      message: `The dependency graph after execution is ${snapshot.dependencyGraph.certainty}, so the DAG and the import edits cannot be confirmed.`,
      nextAction:
        "Follow each diagnostic's nextAction in this response, then run postcondition again. Until it passes, report the restructure as unverified, never as complete.",
      path: snapshot.projectRoot,
    });
  return findings;
}
