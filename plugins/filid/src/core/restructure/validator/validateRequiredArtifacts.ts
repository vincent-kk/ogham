import { portableJoin, samePath } from '@ogham/cross-platform/paths';

import { DETAIL_MD, INTENT_MD } from '../../../constants/documentFiles.js';
import {
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_VALIDATION_CODES,
  RESTRUCTURE_VALIDATION_MESSAGES,
} from '../../../constants/restructure.js';
import type { FractalNode } from '../../../types/fractal.js';
import type {
  MoveInstruction,
  PlanValidationFinding,
  RequiredArtifact,
} from '../../../types/restructure.js';

function documentExists(
  node: FractalNode,
  artifact: RequiredArtifact,
): boolean {
  if (artifact.role === REQUIRED_ARTIFACT_ROLES.INTENT_DOCUMENT)
    return (
      node.hasIntentMd &&
      samePath(artifact.path, portableJoin(node.path, INTENT_MD))
    );
  return (
    node.hasDetailMd &&
    samePath(artifact.path, portableJoin(node.path, DETAIL_MD))
  );
}

function entryPointExists(
  node: FractalNode,
  artifact: RequiredArtifact,
): boolean {
  return node.entryPoints.some(
    (entryPoint) =>
      samePath(entryPoint.path, artifact.path) &&
      (!artifact.adapterId || entryPoint.adapterId === artifact.adapterId),
  );
}

export function validateRequiredArtifacts(
  move: MoveInstruction,
  targetNode: FractalNode | null,
): PlanValidationFinding[] {
  if (!targetNode) return [];
  return move.requiredArtifacts.flatMap<PlanValidationFinding>((artifact) => {
    if (artifact.role === REQUIRED_ARTIFACT_ROLES.ENTRY_POINT)
      return entryPointExists(targetNode, artifact)
        ? []
        : [
            {
              code: RESTRUCTURE_VALIDATION_CODES.ENTRY_POINT_MISSING,
              message: RESTRUCTURE_VALIDATION_MESSAGES.ENTRY_POINT_MISSING,
              path: artifact.path,
              sourcePath: move.sourcePath,
            },
          ];
    return documentExists(targetNode, artifact)
      ? []
      : [
          {
            code: RESTRUCTURE_VALIDATION_CODES.REQUIRED_ARTIFACT_MISSING,
            message: RESTRUCTURE_VALIDATION_MESSAGES.REQUIRED_ARTIFACT_MISSING,
            path: artifact.path,
            sourcePath: move.sourcePath,
          },
        ];
  });
}
