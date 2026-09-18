import { portableJoin, portableRelative } from '@ogham/cross-platform';

import type { PlannedMove } from '../../../types/restructure.js';

import { isAtOrWithin } from './isAtOrWithin.js';

/**
 * Where a consumer file stands once every planned move has run.
 *
 * When sources overlap — a directory and a file inside it both move — the
 * deepest source wins, because its move names that file explicitly.
 * @param path - Absolute consumer path in the pre-move snapshot
 * @param plannedMoves - Executable moves of the same plan
 * @returns The post-plan path, or `path` itself when no planned source holds it
 */
export function relocateConsumerPath(
  path: string,
  plannedMoves: readonly PlannedMove[],
): string {
  const move = plannedMoves
    .filter(({ sourcePath }) => isAtOrWithin(sourcePath, path))
    .reduce<PlannedMove | undefined>(
      (deepest, candidate) =>
        deepest && deepest.sourcePath.length >= candidate.sourcePath.length
          ? deepest
          : candidate,
      undefined,
    );
  if (!move) return path;
  return portableJoin(move.targetPath, portableRelative(move.sourcePath, path));
}
