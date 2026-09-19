import { RESTRUCTURE_UNIT_KINDS } from '../../../constants/restructure.js';
import type { FractalTree } from '../../../types/fractal.js';
import type { MoveInstruction } from '../../../types/restructure.js';
import {
  type RelevanceTarget,
  classifyRelevanceTarget,
} from '../../analysis/dependencyGraph/index.js';

/**
 * The units and consumers a plan's relevance filter judges unknown files by.
 *
 * Each instruction contributes its source and its target, both absolute; a
 * unit other than a single file is a directory, and a file the adapter
 * reported as its directory's module entry is a module index. The target takes
 * the source's kind: a moved module index lands as one, even before its new
 * directory exists in `tree`. Every consumer the plan
 * placed by or requires an import of is related whatever its text, since its
 * unconfirmed references could hide the very import the requirement is about.
 * @param tree Tree of the plan-time snapshot, whose nodes carry the adapter's entry points.
 * @param instructions Moves, already-placed and unresolved instructions; pass
 *   post-execution instructions with their final targets for postcondition.
 * @returns Absolute targets and absolute consumer paths.
 */
export function collectRelevanceUnits(
  tree: FractalTree,
  instructions: readonly MoveInstruction[],
): { targets: RelevanceTarget[]; consumerPaths: string[] } {
  return {
    targets: instructions.flatMap(({ sourcePath, targetPath, unitKind }) => {
      const kind = classifyRelevanceTarget(
        tree,
        sourcePath,
        unitKind !== RESTRUCTURE_UNIT_KINDS.FILE,
      );
      return [
        { path: sourcePath, kind },
        { path: targetPath, kind },
      ];
    }),
    consumerPaths: instructions.flatMap((move) => [
      ...move.consumerPaths,
      ...[...move.affectedImports, ...move.preservedImports].map(
        ({ consumerPath }) => consumerPath,
      ),
    ]),
  };
}
