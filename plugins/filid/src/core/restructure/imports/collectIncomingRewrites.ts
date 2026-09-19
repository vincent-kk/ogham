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
 * Rewrites and delegations for imports that load a file inside the moved unit.
 *
 * An entry is emitted only when this unit is the first move to carry the
 * imported file, and it points the consumer's final path at the file's final
 * path. An import whose specifier denotes its file is rewritten; any other is
 * delegated to the caller, or preserved when the moves keep the file at the
 * same place relative to the consumer.
 * @param snapshot - Pre-move snapshot
 * @param unit - The moved unit
 * @param orderedMoves - Executable moves in execution order, holding `unit`
 * @returns Owned rewrites, delegated imports and preserved imports
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
  const result: ImportRewriteBuildResult = {
    rewrites: [],
    delegated: [],
    preserved: [],
  };

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
      if (
        !specifierDenotesPath(
          evidence.sourceFile,
          evidence.rawSpecifier,
          evidence.resolvedPath,
        )
      ) {
        const kept = keepsRelativeLocation(
          evidence.sourceFile,
          evidence.resolvedPath,
          consumerPath,
          finalPath,
        );
        (kept ? result.preserved : result.delegated).push({
          consumerPath,
          currentSpecifier: evidence.rawSpecifier,
          requiredResolvedPath: finalPath,
        });
        continue;
      }
      result.rewrites.push({
        consumerPath,
        currentSpecifier: evidence.rawSpecifier,
        requiredSpecifier: formatRequiredSpecifier(
          consumerPath,
          finalPath,
          evidence.rawSpecifier,
          'file',
        ),
      });
    }

  return result;
}
