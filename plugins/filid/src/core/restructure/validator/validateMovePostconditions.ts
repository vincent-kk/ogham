import { samePath } from '@ogham/cross-platform';

import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  MoveInstruction,
  PlanValidationFinding,
} from '../../../types/restructure.js';

import type { RequiredLoads } from './collectRequiredLoads.js';
import { hasSourceLeftovers } from './hasSourceLeftovers.js';
import { snapshotContainsPath } from './snapshotContainsPath.js';
import { validateTargetPostconditions } from './validateTargetPostconditions.js';

/**
 * Postconditions of one executed move.
 * @param snapshot - Post-execution snapshot
 * @param move - The move as planned; its source must be gone
 * @param finalMove - The same move with its target and artifacts at their final paths
 * @param reoccupants - Final targets of other units at or inside the source path;
 * one equal to the source excuses the source entirely, ones inside it excuse only what they hold
 * @param requiredLoads - Files the whole plan requires of each consumer
 * @returns Findings for a remaining source and for the final target
 */
export function validateMovePostconditions(
  snapshot: ProjectSnapshot,
  move: MoveInstruction,
  finalMove: MoveInstruction,
  reoccupants: readonly string[],
  requiredLoads: RequiredLoads,
): PlanValidationFinding[] {
  const findings: PlanValidationFinding[] = [];
  const sourceRemains = reoccupants.some((target) =>
    samePath(target, move.sourcePath),
  )
    ? false
    : reoccupants.length > 0
      ? hasSourceLeftovers(snapshot, move.sourcePath, reoccupants)
      : snapshotContainsPath(snapshot, move.sourcePath);
  if (sourceRemains)
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.SOURCE_STILL_PRESENT,
      message: `${move.sourcePath} still exists after execution.`,
      nextAction: `Finish the move: relocate ${move.sourcePath} — do not copy it — to where the plan lists it, then run postcondition again.`,
      path: move.sourcePath,
      sourcePath: move.sourcePath,
    });
  findings.push(...validateTargetPostconditions(snapshot, finalMove, requiredLoads));
  return findings;
}
