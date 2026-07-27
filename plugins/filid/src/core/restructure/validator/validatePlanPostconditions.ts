import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  PlanValidationResult,
  RestructurePlan,
} from '../../../types/restructure.js';

import { validateBoundaryPostconditions } from './validateBoundaryPostconditions.js';
import { validateDependencyPostconditions } from './validateDependencyPostconditions.js';
import { validateMovePostconditions } from './validateMovePostconditions.js';

export function validatePlanPostconditions(
  snapshot: ProjectSnapshot,
  plan: RestructurePlan,
): PlanValidationResult {
  const findings = plan.moves.flatMap((move) =>
    validateMovePostconditions(snapshot, move),
  );
  findings.push(
    ...validateBoundaryPostconditions(snapshot),
    ...validateDependencyPostconditions(snapshot),
  );
  return { valid: findings.length === 0, findings };
}
