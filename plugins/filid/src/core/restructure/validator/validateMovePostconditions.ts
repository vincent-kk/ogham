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
