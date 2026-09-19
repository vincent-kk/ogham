import { samePath } from '@ogham/cross-platform';

import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { OrderConflict, PlannedMove } from '../../../types/restructure.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

import { findOrderConflicts } from './findOrderConflicts.js';
import { isVacuousMove } from './isVacuousMove.js';
import { mustPrecede } from './mustPrecede.js';

/** Indexes among `candidates` of the moves whose source lies strictly inside the move at `index`. */
function innerMoveIndexes(
  moves: readonly PlannedMove[],
  index: number,
  candidates: readonly number[],
): number[] {
  const { sourcePath } = moves[index];
  return candidates.filter(
    (other) =>
      other !== index &&
      !samePath(moves[other].sourcePath, sourcePath) &&
      isAtOrWithin(sourcePath, moves[other].sourcePath),
  );
}

/**
 * Order executable moves so that running them one after another produces the
 * planned layout.
 *
 * Moves on an ordering cycle, moves nested in themselves and directory moves
 * left empty are conflicts. The rest are sorted topologically; among moves
 * ready to run, the earliest request goes first.
 * @param moves - Executable candidate moves, in request order
 * @param snapshot - Pre-move snapshot, for the files a directory holds
 * @returns Input indexes in execution order, and the conflicts by ascending
 * index; an emptied directory's `related` lists the inner moves that empty it
 */
export function orderPlannedMoves(
  moves: readonly PlannedMove[],
  snapshot: ProjectSnapshot,
): { order: number[]; conflicts: OrderConflict[] } {
  const cyclic = findOrderConflicts(moves);
  const acyclic = moves.flatMap((_, index) =>
    cyclic.some((conflict) => conflict.index === index) ? [] : [index],
  );
  const vacuous = acyclic.filter((index) =>
    isVacuousMove(
      moves[index],
      acyclic.filter((other) => other !== index).map((other) => moves[other]),
      snapshot,
    ),
  );
  const pending = acyclic.filter((index) => !vacuous.includes(index));
  const order: number[] = [];
  while (pending.length > 0) {
    const ready = pending.findIndex((index) =>
      pending.every(
        (other) => other === index || !mustPrecede(moves[other], moves[index]),
      ),
    );
    order.push(...pending.splice(ready, 1));
  }
  const emptied: OrderConflict[] = vacuous.map((index) => ({
    index,
    cause: 'emptied',
    related: innerMoveIndexes(moves, index, acyclic),
  }));
  return {
    order,
    conflicts: [...cyclic, ...emptied].sort(
      (left, right) => left.index - right.index,
    ),
  };
}
