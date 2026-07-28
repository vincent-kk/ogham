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

export function validateMovePostconditions(
  snapshot: ProjectSnapshot,
  move: MoveInstruction,
): PlanValidationFinding[] {
  const findings: PlanValidationFinding[] = [];
  if (snapshotContainsPath(snapshot, move.sourcePath))
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.SOURCE_STILL_PRESENT,
      message: RESTRUCTURE_VALIDATION_MESSAGES.SOURCE_STILL_PRESENT,
      path: move.sourcePath,
      sourcePath: move.sourcePath,
    });
  findings.push(...validateTargetPostconditions(snapshot, move));
  return findings;
}
