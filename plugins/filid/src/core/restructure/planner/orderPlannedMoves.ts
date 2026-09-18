import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { PlannedMove } from '../../../types/restructure.js';

import { findOrderConflicts } from './findOrderConflicts.js';
import { isVacuousMove } from './isVacuousMove.js';
import { mustPrecede } from './mustPrecede.js';

/**
 * Order executable moves so that running them one after another produces the
 * planned layout.
 *
 * Moves on an ordering cycle, moves nested in themselves and directory moves
 * left empty are conflicts. The rest are sorted topologically; among moves
 * ready to run, the earliest request goes first.
 * @param moves - Executable candidate moves, in request order
 * @param snapshot - Pre-move snapshot, for the files a directory holds
 * @returns Input indexes in execution order, and the conflicting indexes
 * ascending
 */
export function orderPlannedMoves(
  moves: readonly PlannedMove[],
  snapshot: ProjectSnapshot,
): { order: number[]; conflicts: number[] } {
  const cyclic = new Set(findOrderConflicts(moves));
  const acyclic = moves.flatMap((_, index) =>
    cyclic.has(index) ? [] : [index],
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
  return {
    order,
    conflicts: [...cyclic, ...vacuous].sort((left, right) => left - right),
  };
}
