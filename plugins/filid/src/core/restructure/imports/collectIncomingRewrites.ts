import {
  portableJoin,
  portableRelative,
  samePath,
} from '@ogham/cross-platform';

import { RESTRUCTURE_DECISION_REASONS } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRewrite,
  ImportRewriteBuildResult,
  PlannedMove,
  RestructureDecisionReason,
  RewriteUnit,
} from '../../../types/restructure.js';
import { specifierDenotesPath } from '../specifiers/specifierDenotesPath.js';

import { findCarryingMoveIndex } from './findCarryingMoveIndex.js';
import { formatRequiredSpecifier } from './formatRequiredSpecifier.js';
import { isAtOrWithin } from './isAtOrWithin.js';
import { relocateThroughMoves } from './relocateThroughMoves.js';

/**
 * Rewrites for imports that load a file inside the moved unit.
 *
 * Every such import is judged, whoever the consumer is; an import that does
 * not denote its file exactly is a decision reason. A rewrite is emitted only
 * when this unit is the first move to carry the imported file, and it points
 * the consumer's final path at the file's final path.
 * @param snapshot - Pre-move snapshot
 * @param unit - The moved unit
 * @param orderedMoves - Executable moves in execution order, holding `unit`
 * @returns Owned rewrites and decision reasons
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
  const rewrites: ImportRewrite[] = [];
  const reasons = new Set<RestructureDecisionReason>();

  for (const edge of snapshot.dependencyGraph.edges)
    for (const evidence of edge.evidence) {
      const importsUnit =
        samePath(evidence.resolvedPath, unit.sourcePath) ||
        (sourceIsDirectory &&
          isAtOrWithin(unit.sourcePath, evidence.resolvedPath));
      if (!importsUnit) continue;
      if (
        !specifierDenotesPath(
          evidence.sourceFile,
          evidence.rawSpecifier,
          evidence.resolvedPath,
        )
      ) {
        reasons.add(RESTRUCTURE_DECISION_REASONS.IMPORT_REWRITE_UNSUPPORTED);
        continue;
      }
      if (
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
      rewrites.push({
        consumerPath,
        currentSpecifier: evidence.rawSpecifier,
        requiredSpecifier: formatRequiredSpecifier(
          consumerPath,
          relocateThroughMoves(landedPath, orderedMoves, unitIndex + 1),
          evidence.rawSpecifier,
          'file',
        ),
      });
    }

  return { rewrites, decisionReasons: [...reasons] };
}
