import {
  RESTRUCTURE_VALIDATION_CODES,
  RESTRUCTURE_VALIDATION_MESSAGES,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  MoveInstruction,
  PlanValidationFinding,
} from '../../../types/restructure.js';

import { snapshotContainsPath } from './snapshotContainsPath.js';
import { validateTargetPostconditions } from './validateTargetPostconditions.js';

/**
 * Postconditions of one executed move.
 * @param snapshot - Post-execution snapshot
 * @param move - The move as planned; its source must be gone
 * @param finalMove - The same move with its target and artifacts at their final paths
 * @param sourceReoccupied - Whether another unit legitimately lands on the source path
 * @returns Findings for a remaining source and for the final target
 */
export function validateMovePostconditions(
  snapshot: ProjectSnapshot,
  move: MoveInstruction,
  finalMove: MoveInstruction,
  sourceReoccupied: boolean,
): PlanValidationFinding[] {
  const findings: PlanValidationFinding[] = [];
  if (!sourceReoccupied && snapshotContainsPath(snapshot, move.sourcePath))
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.SOURCE_STILL_PRESENT,
      message: RESTRUCTURE_VALIDATION_MESSAGES.SOURCE_STILL_PRESENT,
      path: move.sourcePath,
      sourcePath: move.sourcePath,
    });
  findings.push(...validateTargetPostconditions(snapshot, finalMove));
  return findings;
}
