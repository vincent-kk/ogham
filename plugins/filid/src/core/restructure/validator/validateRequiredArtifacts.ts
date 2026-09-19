import { portableJoin, samePath } from '@ogham/cross-platform';

import { DETAIL_MD, INTENT_MD } from '../../../constants/documentFiles.js';
import {
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_VALIDATION_CODES,
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
              message: artifact.adapterId
                ? `No entry point that adapter ${artifact.adapterId} recognizes exists at ${artifact.path}.`
                : `No entry point exists at ${artifact.path}.`,
              nextAction: `Create ${artifact.path} and export the unit's public surface from it, then run postcondition again.`,
              path: artifact.path,
              sourcePath: move.sourcePath,
            },
          ];
    return documentExists(targetNode, artifact)
      ? []
      : [
          {
            code: RESTRUCTURE_VALIDATION_CODES.REQUIRED_ARTIFACT_MISSING,
            message: `${artifact.path} is missing after execution.`,
            nextAction: `Create ${artifact.path} for the new fractal, then run postcondition again.`,
            path: artifact.path,
            sourcePath: move.sourcePath,
          },
        ];
  });
}
