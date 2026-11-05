import { portableJoin, samePath } from '@ogham/cross-platform';

import { INTENT_MD } from '../../../constants/documentFiles.js';
import { FACTS_SECTION_UNAVAILABLE_NEXT_ACTION } from '../../../constants/facts.js';
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

/**
 * Check the plan's mandatory boundary artifacts against post-execution evidence.
 * @param move - Planned target and required artifacts, at their final paths.
 * @param targetNode - Resolved target; missing targets are reported by the caller.
 * @returns Missing or unsupported artifacts without requiring an optional DETAIL.
 */
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
            message: `No enumerated export surface is known for the entry point ${artifact.path}, so the postcondition cannot confirm it exposes the unit.`,
            nextAction: `${artifact.path} exists, but nothing states its exports. ${FACTS_SECTION_UNAVAILABLE_NEXT_ACTION}`,
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
    return targetNode.hasIntentMd &&
      samePath(artifact.path, portableJoin(targetNode.path, INTENT_MD))
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
