import { portableIsAbsolute, samePath } from '@ogham/cross-platform';

import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRewriteBuildResult,
  PlannedMove,
  RewriteUnit,
} from '../../../types/restructure.js';
import { specifierDenotesDirectoryOf } from '../specifiers/specifierDenotesDirectoryOf.js';
import { specifierDenotesPath } from '../specifiers/specifierDenotesPath.js';

import { findCarryingMoveIndex } from './findCarryingMoveIndex.js';
import { formatRequiredSpecifier } from './formatRequiredSpecifier.js';
import { isAtOrWithin } from './isAtOrWithin.js';
import { keepsRelativeLocation } from './keepsRelativeLocation.js';
import { relocateThroughMoves } from './relocateThroughMoves.js';

/**
 * Rewrites and delegations for imports that a file inside the moved unit
 * makes to a file outside it.
 *
 * An absolute specifier survives the consumer's move and needs nothing. An
 * entry is emitted only when this unit is the first move to carry the
 * importing file and no move carries the imported one — otherwise the
 * imported file's own move lists it. A file or directory reference is
 * rewritten; any other is delegated to the caller, or preserved when the
 * consumer's move keeps the imported file at the same relative place.
 * @param snapshot - Pre-move snapshot
 * @param unit - The moved unit
 * @param orderedMoves - Executable moves in execution order, holding `unit`
 * @returns Owned rewrites, delegated imports and preserved imports
 */
export function collectOutgoingRewrites(
  snapshot: ProjectSnapshot,
  unit: RewriteUnit,
  orderedMoves: readonly PlannedMove[],
): ImportRewriteBuildResult {
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
      if (
        !isAtOrWithin(unit.sourcePath, evidence.sourceFile) ||
        isAtOrWithin(unit.sourcePath, evidence.resolvedPath) ||
        portableIsAbsolute(evidence.rawSpecifier) ||
        unitIndex < 0 ||
        findCarryingMoveIndex(evidence.sourceFile, orderedMoves) !==
          unitIndex ||
        findCarryingMoveIndex(evidence.resolvedPath, orderedMoves) >= 0
      )
        continue;

      const consumerPath = relocateThroughMoves(
        evidence.sourceFile,
        orderedMoves,
      );
      const denotesFile = specifierDenotesPath(
        evidence.sourceFile,
        evidence.rawSpecifier,
        evidence.resolvedPath,
      );
      const directory = denotesFile
        ? null
        : specifierDenotesDirectoryOf(
            evidence.sourceFile,
            evidence.rawSpecifier,
            evidence.resolvedPath,
          );
      if (!denotesFile && directory === null) {
        const kept = keepsRelativeLocation(
          evidence.sourceFile,
          evidence.resolvedPath,
          consumerPath,
          evidence.resolvedPath,
        );
        (kept ? result.preserved : result.delegated).push({
          consumerPath,
          currentSpecifier: evidence.rawSpecifier,
          requiredResolvedPath: evidence.resolvedPath,
        });
        continue;
      }
      result.rewrites.push({
        consumerPath,
        currentSpecifier: evidence.rawSpecifier,
        requiredSpecifier: formatRequiredSpecifier(
          consumerPath,
          directory ?? evidence.resolvedPath,
          evidence.rawSpecifier,
          denotesFile ? 'file' : 'directory',
        ),
      });
    }

  return result;
}
