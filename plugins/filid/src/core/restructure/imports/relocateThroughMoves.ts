import { portableJoin, portableRelative } from '@ogham/cross-platform';

import type { PlannedMove } from '../../../types/restructure.js';

import { isAtOrWithin } from './isAtOrWithin.js';

/**
 * Where a path ends up once planned moves run in execution order.
 *
 * Each move from `fromIndex` on carries the path along when its source holds
 * it, so a unit placed inside a directory that a later move relocates follows
 * that directory.
 * @param path - Absolute path as it stands before `orderedMoves[fromIndex]` runs
 * @param orderedMoves - Executable moves in execution order
 * @param fromIndex - First move still to run; earlier moves have already run
 * @returns The path after every remaining move; `path` itself when none holds it
 */
export function relocateThroughMoves(
  path: string,
  orderedMoves: readonly PlannedMove[],
  fromIndex = 0,
): string {
  let current = path;
  for (const move of orderedMoves.slice(fromIndex))
    if (isAtOrWithin(move.sourcePath, current))
      current = portableJoin(
        move.targetPath,
        portableRelative(move.sourcePath, current),
      );
  return current;
}
