import { samePath } from '@ogham/cross-platform';

import type { PlannedMove } from '../../../types/restructure.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

import { mustPrecede } from './mustPrecede.js';

function nestsInItself({ sourcePath, targetPath }: PlannedMove): boolean {
  if (samePath(sourcePath, targetPath)) return false;
  return (
    isAtOrWithin(sourcePath, targetPath) || isAtOrWithin(targetPath, sourcePath)
  );
}

/**
 * Moves that no execution order can satisfy.
 *
 * A move whose target and source contain each other cannot run at all. A move
 * on a cycle of ordering constraints — duplicate sources, or a directory move
 * that already carries an inner move to that move's own target — has no valid
 * position. Moves outside every cycle are not reported, so they stay in the
 * plan. Plans hold few moves, so the transitive closure is computed directly.
 * @param moves - Executable candidate moves, in request order
 * @returns Indexes of the conflicting moves, ascending
 */
export function findOrderConflicts(moves: readonly PlannedMove[]): number[] {
  const reaches = moves.map((from, fromIndex) =>
    moves.map((to, toIndex) => fromIndex !== toIndex && mustPrecede(from, to)),
  );
  for (let via = 0; via < moves.length; via += 1)
    for (let from = 0; from < moves.length; from += 1)
      for (let to = 0; to < moves.length; to += 1)
        reaches[from][to] ||= reaches[from][via] && reaches[via][to];
  return moves.flatMap((move, index) =>
    reaches[index][index] || nestsInItself(move) ? [index] : [],
  );
}
