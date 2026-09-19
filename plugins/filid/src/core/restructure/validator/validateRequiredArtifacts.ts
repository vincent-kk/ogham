import { portableJoin, samePath } from '@ogham/cross-platform';

import { DETAIL_MD, INTENT_MD } from '../../../constants/documentFiles.js';
import {
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_VALIDATION_CODES,
} from '../../../constants/restructure.js';
import type {
  EntryPointDescriptor,
  FractalNode,
} from '../../../types/fractal.js';
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

/**
 * The entry point of the target node that satisfies a required entry-point artifact.
 * @param node - Target node after execution
 * @param artifact - Required entry-point artifact
 * @returns The matching adapter-reported entry point, or undefined when none exists
 */
function findEntryPoint(
  node: FractalNode,
  artifact: RequiredArtifact,
): EntryPointDescriptor | undefined {
  return node.entryPoints.find(
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
    if (artifact.role === REQUIRED_ARTIFACT_ROLES.ENTRY_POINT) {
      const entryPoint = findEntryPoint(targetNode, artifact);
      if (entryPoint?.surface === 'unsupported')
        return [
          {
            code: RESTRUCTURE_VALIDATION_CODES.ENTRY_POINT_SURFACE_UNSUPPORTED,
            message: `Adapter ${entryPoint.adapterId} cannot inspect the exports of the entry point ${artifact.path}, so the postcondition cannot confirm it exposes the unit.`,
            nextAction: `Tell the user that ${artifact.path} exists but its exports cannot be verified by filid, and let them confirm by hand that it exports the unit's public surface; the finding clears only once an adapter that enumerates this entry point's surface is enabled.`,
            path: artifact.path,
            sourcePath: move.sourcePath,
          },
        ];
      return entryPoint
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
    }
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
