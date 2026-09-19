import {
  RESTRUCTURE_NODE_TYPES,
  RESTRUCTURE_VALIDATION_CODES,
} from '../../../constants/restructure.js';
import type { FractalNode, ProjectSnapshot } from '../../../types/fractal.js';
import type {
  MoveInstruction,
  PlanValidationFinding,
} from '../../../types/restructure.js';

import { resolveTargetNode } from './resolveTargetNode.js';
import { snapshotContainsPath } from './snapshotContainsPath.js';
import { validateDelegatedImports } from './validateDelegatedImports.js';
import { validateImportRewrites } from './validateImportRewrites.js';
import { validateRequiredArtifacts } from './validateRequiredArtifacts.js';

/** The next action for a target that classifies as another node type than the plan requires. */
function typeMismatchAction(node: FractalNode, expected: string): string {
  if (expected === RESTRUCTURE_NODE_TYPES.FRACTAL)
    return `Give ${node.path} INTENT.md, DETAIL.md and the entry point that requiredArtifacts lists, then run postcondition again.`;
  if (expected === RESTRUCTURE_NODE_TYPES.ORGAN)
    return `Remove what makes ${node.path} classify as ${node.type} — INTENT.md, DETAIL.md, or a module entry file such as index.ts — or, if the unit needs its entry file, create a new plan with contractIntent "independent". Then run postcondition again.`;
  return `Make ${node.path} a ${expected} as the plan lists it, then run postcondition again.`;
}

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
      message: `${move.targetPath} does not exist after execution.`,
      nextAction: `Move ${move.sourcePath} so it ends at exactly ${move.targetPath} — no other path passes — then run postcondition again.`,
      path: move.targetPath,
      sourcePath: move.sourcePath,
    });
  const targetNode = resolveTargetNode(snapshot, move);
  if (targetNode && targetNode.type !== move.targetNodeType)
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.TARGET_NODE_TYPE_MISMATCH,
      message: `${targetNode.path} classifies as ${targetNode.type}, but the plan requires ${move.targetNodeType}.`,
      nextAction: typeMismatchAction(targetNode, move.targetNodeType),
      path: targetNode.path,
      sourcePath: move.sourcePath,
    });
  findings.push(
    ...validateRequiredArtifacts(move, targetNode),
    ...validateImportRewrites(snapshot, move),
    ...validateDelegatedImports(snapshot, move),
  );
  return findings;
}
