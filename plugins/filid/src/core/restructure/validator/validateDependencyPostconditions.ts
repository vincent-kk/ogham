import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import {
  RESTRUCTURE_VALIDATION_CODES,
  RESTRUCTURE_VALIDATION_MESSAGES,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { PlanValidationFinding } from '../../../types/restructure.js';

export function validateDependencyPostconditions(
  snapshot: ProjectSnapshot,
): PlanValidationFinding[] {
  const findings: PlanValidationFinding[] = snapshot.dependencyGraph.cycles.map(
    (cycle) => ({
      code: RESTRUCTURE_VALIDATION_CODES.DEPENDENCY_CYCLE,
      message: RESTRUCTURE_VALIDATION_MESSAGES.DEPENDENCY_CYCLE,
      path: cycle[0] ?? snapshot.projectRoot,
    }),
  );
  if (snapshot.dependencyGraph.certainty !== ANALYSIS_CERTAINTIES.EXACT)
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.DEPENDENCY_GRAPH_INDETERMINATE,
      message: RESTRUCTURE_VALIDATION_MESSAGES.DEPENDENCY_GRAPH_INDETERMINATE,
      path: snapshot.projectRoot,
    });
  return findings;
}
