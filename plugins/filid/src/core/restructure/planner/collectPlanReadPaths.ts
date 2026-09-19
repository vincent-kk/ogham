import { portableJoin } from '@ogham/cross-platform';

import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { PlannedMove } from '../../../types/restructure.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

import { sortUniquePaths } from './sortUniquePaths.js';

/**
 * The files whose bytes the plan's import requirements come from: every file
 * inside a move source, every consumer that imports one, and every file a
 * moved file imports. Placement inputs are the probe set's, not this one's.
 * @param snapshot - Pre-move snapshot supplying the tree and dependency evidence
 * @param moves - Executable moves of the plan
 * @returns Absolute paths inside the project root, sorted and without duplicates
 */
export function collectPlanReadPaths(
  snapshot: ProjectSnapshot,
  moves: readonly PlannedMove[],
): string[] {
  const moved = (path: string) =>
    moves.some(({ sourcePath }) => isAtOrWithin(sourcePath, path));
  const sourceFiles = [...snapshot.tree.nodes.values()]
    .flatMap((node) =>
      node.peerFiles.map((file) => portableJoin(node.path, file)),
    )
    .filter(moved);
  const referenced = snapshot.dependencyGraph.edges
    .flatMap(({ evidence }) => evidence)
    .flatMap(({ sourceFile, resolvedPath }) => [
      ...(moved(resolvedPath) ? [sourceFile] : []),
      ...(moved(sourceFile) ? [resolvedPath] : []),
    ]);
  return sortUniquePaths(
    [...sourceFiles, ...referenced].filter((path) =>
      isAtOrWithin(snapshot.projectRoot, path),
    ),
  );
}
