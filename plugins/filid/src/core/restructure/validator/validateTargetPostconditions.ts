import {
  RESTRUCTURE_VALIDATION_CODES,
  RESTRUCTURE_VALIDATION_MESSAGES,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  MoveInstruction,
  PlanValidationFinding,
} from '../../../types/restructure.js';

import { resolveTargetNode } from './resolveTargetNode.js';
import { snapshotContainsPath } from './snapshotContainsPath.js';
import { validateImportRewrites } from './validateImportRewrites.js';
import { validateRequiredArtifacts } from './validateRequiredArtifacts.js';

/**
 * Everything a planned landing must show, minus the source's absence.
 *
 * An instruction whose target equals its source has nothing to move, so that
 * one assertion is the only one that cannot apply to it. The rest still can,
 * and without them an actor who lands the unit somewhere the plan never named
 * passes a check whose whole purpose is the exact target.
 */
export function validateTargetPostconditions(
  snapshot: ProjectSnapshot,
  move: MoveInstruction,
): PlanValidationFinding[] {
  const findings: PlanValidationFinding[] = [];
  if (!snapshotContainsPath(snapshot, move.targetPath))
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.TARGET_MISSING,
      message: RESTRUCTURE_VALIDATION_MESSAGES.TARGET_MISSING,
      path: move.targetPath,
      sourcePath: move.sourcePath,
    });
  const targetNode = resolveTargetNode(snapshot, move);
  if (targetNode && targetNode.type !== move.targetNodeType)
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.TARGET_NODE_TYPE_MISMATCH,
      message: RESTRUCTURE_VALIDATION_MESSAGES.TARGET_NODE_TYPE_MISMATCH,
      path: targetNode.path,
      sourcePath: move.sourcePath,
    });
  findings.push(
    ...validateRequiredArtifacts(move, targetNode),
    ...validateImportRewrites(snapshot, move),
  );
  return findings;
}
