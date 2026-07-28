import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  PlanValidationResult,
  RestructurePlan,
} from '../../../types/restructure.js';

import { validateBoundaryPostconditions } from './validateBoundaryPostconditions.js';
import { validateDependencyPostconditions } from './validateDependencyPostconditions.js';
import { validateMovePostconditions } from './validateMovePostconditions.js';
import { validateTargetPostconditions } from './validateTargetPostconditions.js';

/**
 * `alreadyPlaced` is exempt from the source-absence assertion and from nothing
 * else: its unit still has to sit at the planned path, so it runs the target
 * half of the same postcondition.
 */
export function validatePlanPostconditions(
  snapshot: ProjectSnapshot,
  plan: RestructurePlan,
): PlanValidationResult {
  const findings = [
    ...plan.moves.flatMap((move) => validateMovePostconditions(snapshot, move)),
    ...plan.alreadyPlaced.flatMap((move) =>
      validateTargetPostconditions(snapshot, move),
    ),
  ];
  findings.push(
    ...validateBoundaryPostconditions(snapshot),
    ...validateDependencyPostconditions(snapshot),
  );
  return { valid: findings.length === 0, findings };
}
