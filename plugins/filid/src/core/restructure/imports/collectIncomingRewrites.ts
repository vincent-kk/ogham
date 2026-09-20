import {
  portableJoin,
  portableRelative,
  samePath,
} from '@ogham/cross-platform';

import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRewriteBuildResult,
  PlannedMove,
  RewriteUnit,
} from '../../../types/restructure.js';
import { specifierDenotesPath } from '../specifiers/specifierDenotesPath.js';

import { findCarryingMoveIndex } from './findCarryingMoveIndex.js';
import { formatRequiredSpecifier } from './formatRequiredSpecifier.js';
import { isAtOrWithin } from './isAtOrWithin.js';
import { keepsRelativeLocation } from './keepsRelativeLocation.js';
import { relocateThroughMoves } from './relocateThroughMoves.js';

/**
 * Required and preserved import requirements for imports that load a file inside the moved unit.
 *
 * An entry is emitted only when this unit is the first move to carry the
 * imported file, and it requires the consumer's final path to load the file's
 * final path. An import whose specifier denotes its file carries a suggested
 * specifier; any other carries none, or is preserved when the moves keep the
 * file at the same place relative to the consumer.
 * @param snapshot - Pre-move snapshot
 * @param unit - The moved unit
 * @param orderedMoves - Executable moves in execution order, holding `unit`
 * @returns Owned import requirements and preserved imports
 */
export function collectIncomingRewrites(
  snapshot: ProjectSnapshot,
  unit: RewriteUnit,
  orderedMoves: readonly PlannedMove[],
): ImportRewriteBuildResult {
  const sourceIsDirectory = [...snapshot.tree.nodes.values()].some((node) =>
    samePath(node.path, unit.sourcePath),
  );
  const unitIndex = orderedMoves.findIndex(({ sourcePath }) =>
    samePath(sourcePath, unit.sourcePath),
  );
  const result: ImportRewriteBuildResult = { required: [], preserved: [] };

  for (const edge of snapshot.dependencyGraph.edges)
    for (const evidence of edge.evidence) {
      const importsUnit =
        samePath(evidence.resolvedPath, unit.sourcePath) ||
        (sourceIsDirectory &&
          isAtOrWithin(unit.sourcePath, evidence.resolvedPath));
      if (
        !importsUnit ||
        unitIndex < 0 ||
        findCarryingMoveIndex(evidence.resolvedPath, orderedMoves) !== unitIndex
      )
        continue;

      const landedPath = samePath(evidence.resolvedPath, unit.sourcePath)
        ? unit.rewriteTargetPath
        : portableJoin(
            unit.targetPath,
            portableRelative(unit.sourcePath, evidence.resolvedPath),
          );
      const consumerPath = relocateThroughMoves(
        evidence.sourceFile,
        orderedMoves,
      );
      const finalPath = relocateThroughMoves(
        landedPath,
        orderedMoves,
        unitIndex + 1,
      );
      const requirement = {
        consumerPath,
        currentSpecifier: evidence.rawSpecifier,
        requiredResolvedPath: finalPath,
      };
      const kept = keepsRelativeLocation(
        evidence.sourceFile,
        evidence.resolvedPath,
        consumerPath,
        finalPath,
      );
      if (kept) {
        result.preserved.push(requirement);
        continue;
      }
      if (
        specifierDenotesPath(
          evidence.sourceFile,
          evidence.rawSpecifier,
          evidence.resolvedPath,
        )
      ) {
        result.required.push({
          ...requirement,
          suggestedSpecifier: formatRequiredSpecifier(
            consumerPath,
            finalPath,
            evidence.rawSpecifier,
            'file',
          ),
        });
        continue;
      }
      result.required.push(requirement);
    }

  return result;
}
