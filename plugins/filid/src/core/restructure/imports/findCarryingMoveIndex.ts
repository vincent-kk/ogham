import type { PlannedMove } from '../../../types/restructure.js';

import { isAtOrWithin } from './isAtOrWithin.js';

/**
 * The move that first carries a path away, which owns the rewrites that path
 * needs.
 * @param path - Absolute path before any move runs
 * @param orderedMoves - Executable moves in execution order
 * @returns Index of the first move whose source holds `path`, or -1 when no
 * move carries it
 */
export function findCarryingMoveIndex(
  path: string,
  orderedMoves: readonly PlannedMove[],
): number {
  return orderedMoves.findIndex(({ sourcePath }) =>
    isAtOrWithin(sourcePath, path),
  );
}
