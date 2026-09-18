import { portableIsAbsolute, samePath } from '@ogham/cross-platform';

import { RESTRUCTURE_DECISION_REASONS } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRewrite,
  ImportRewriteBuildResult,
  PlannedMove,
  RestructureDecisionReason,
  RewriteUnit,
} from '../../../types/restructure.js';
import { specifierDenotesDirectoryOf } from '../specifiers/specifierDenotesDirectoryOf.js';
import { specifierDenotesPath } from '../specifiers/specifierDenotesPath.js';

import { findCarryingMoveIndex } from './findCarryingMoveIndex.js';
import { formatRequiredSpecifier } from './formatRequiredSpecifier.js';
import { isAtOrWithin } from './isAtOrWithin.js';
import { relocateThroughMoves } from './relocateThroughMoves.js';

/**
 * Rewrites for imports that a file inside the moved unit makes to a file
 * outside it.
 *
 * Every such import is judged. An absolute specifier survives the consumer's
 * move and needs nothing; a file or directory reference can be rewritten;
 * anything else is a decision reason. A rewrite is emitted only when this
 * unit is the first move to carry the importing file and no move carries the
 * imported one — otherwise the imported file's own move lists it.
 * @param snapshot - Pre-move snapshot
 * @param unit - The moved unit
 * @param orderedMoves - Executable moves in execution order, holding `unit`
 * @returns Owned rewrites and decision reasons
 */
export function collectOutgoingRewrites(
  snapshot: ProjectSnapshot,
  unit: RewriteUnit,
  orderedMoves: readonly PlannedMove[],
): ImportRewriteBuildResult {
  const unitIndex = orderedMoves.findIndex(({ sourcePath }) =>
    samePath(sourcePath, unit.sourcePath),
  );
  const rewrites: ImportRewrite[] = [];
  const reasons = new Set<RestructureDecisionReason>();

  for (const edge of snapshot.dependencyGraph.edges)
    for (const evidence of edge.evidence) {
      if (
        !isAtOrWithin(unit.sourcePath, evidence.sourceFile) ||
        isAtOrWithin(unit.sourcePath, evidence.resolvedPath) ||
        portableIsAbsolute(evidence.rawSpecifier)
      )
        continue;
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
        reasons.add(RESTRUCTURE_DECISION_REASONS.IMPORT_REWRITE_UNSUPPORTED);
        continue;
      }
      if (
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
      rewrites.push({
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

  return { rewrites, decisionReasons: [...reasons] };
}
