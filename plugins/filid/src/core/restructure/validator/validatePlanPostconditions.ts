import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  PlanValidationResult,
  RestructurePlan,
} from '../../../types/restructure.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';
import { collectRelevanceUnits } from '../planner/collectRelevanceUnits.js';
import { partitionPlanUnknownFiles } from '../planner/partitionPlanUnknownFiles.js';
import { readUnknownFileText } from '../planner/readUnknownFileText.js';

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
 * path, so it runs the target half of the same postcondition. Boundary
 * violations and cycles the plan-time baseline already held are reported as
 * `preexisting`, and only unknown files related to the plan's units — sources,
 * final targets and required consumers — block its absence conclusions.
 * @param snapshot - Post-execution snapshot
 * @param plan - The plan the actor carried out
 * @param readFileText - Text of an unknown file by project-relative path, or null
 * @returns Every instruction, boundary and DAG finding, the pre-existing
 * records and the unknown files by relevance; valid when there is no finding
 */
export function validatePlanPostconditions(
  snapshot: ProjectSnapshot,
  plan: RestructurePlan,
  readFileText: (relativePath: string) => string | null = (relativePath) =>
    readUnknownFileText(snapshot.projectRoot, relativePath),
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
  const relevance = collectRelevanceUnits(snapshot.tree, [
    ...finalMoves,
    ...finalPlaced,
  ]);
  const unknownFiles = partitionPlanUnknownFiles(
    snapshot,
    relevance.targets,
    relevance.consumerPaths,
    readFileText,
  );
  const boundaries = validateBoundaryPostconditions(snapshot, plan);
  const dependencies = validateDependencyPostconditions(
    snapshot,
    plan,
    unknownFiles.relevant,
  );
  findings.push(...boundaries.findings, ...dependencies.findings);
  return {
    valid: findings.length === 0,
    findings,
    preexisting: [...boundaries.preexisting, ...dependencies.preexisting],
    unknownFiles: {
      relevant: unknownFiles.relevant,
      other: unknownFiles.other,
    },
  };
}
