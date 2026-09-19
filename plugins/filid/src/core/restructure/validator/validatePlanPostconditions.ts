import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  PlanValidationResult,
  RestructurePlan,
} from '../../../types/restructure.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

import { collectRequiredLoads } from './collectRequiredLoads.js';
import { finalizeMoveTarget } from './finalizeMoveTarget.js';
import { validateBoundaryPostconditions } from './validateBoundaryPostconditions.js';
import { validateDependencyPostconditions } from './validateDependencyPostconditions.js';
import { validateMovePostconditions } from './validateMovePostconditions.js';
import { validateTargetPostconditions } from './validateTargetPostconditions.js';

/**
 * Check a post-execution snapshot against the plan.
 *
 * `moves` run in order, so each target and artifact is checked where the
 * moves after it leave it. A move's source must be gone unless another unit's
 * final target is that path; a target inside it excuses only the files it
 * holds, and an ancestor target excuses nothing left behind. `alreadyPlaced` is exempt from the source-absence
 * assertion and from nothing else: its unit still has to sit at its final
 * path, so it runs the target half of the same postcondition.
 * @param snapshot - Post-execution snapshot
 * @param plan - The plan the actor carried out
 * @returns Every instruction, boundary and DAG finding; valid when none
 */
export function validatePlanPostconditions(
  snapshot: ProjectSnapshot,
  plan: RestructurePlan,
): PlanValidationResult {
  const finalMoves = plan.moves.map((move, index) =>
    finalizeMoveTarget(move, plan.moves, index + 1),
  );
  const finalPlaced = plan.alreadyPlaced.map((move) =>
    finalizeMoveTarget(move, plan.moves, 0),
  );
  const finalTargets = [...finalMoves, ...finalPlaced].map(
    ({ targetPath }) => targetPath,
  );
  const requiredLoads = collectRequiredLoads([...finalMoves, ...finalPlaced]);
  const findings = [
    ...plan.moves.flatMap((move, index) =>
      validateMovePostconditions(
        snapshot,
        move,
        finalMoves[index],
        finalTargets.filter(
          (target, targetIndex) =>
            targetIndex !== index && isAtOrWithin(move.sourcePath, target),
        ),
        requiredLoads,
      ),
    ),
    ...finalPlaced.flatMap((move) =>
      validateTargetPostconditions(snapshot, move, requiredLoads),
    ),
  ];
  findings.push(
    ...validateBoundaryPostconditions(snapshot),
    ...validateDependencyPostconditions(snapshot),
  );
  return { valid: findings.length === 0, findings };
}
