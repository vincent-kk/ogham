import { samePath } from '@ogham/cross-platform';

import type { OrderConflict, PlannedMove } from '../../../types/restructure.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

import { mustPrecede } from './mustPrecede.js';

/** An order conflict that the ordering constraints alone reveal. */
type CyclicConflict = OrderConflict & {
  cause: Exclude<OrderConflict['cause'], 'emptied'>;
};

function nestsInItself({ sourcePath, targetPath }: PlannedMove): boolean {
  if (samePath(sourcePath, targetPath)) return false;
  return (
    isAtOrWithin(sourcePath, targetPath) || isAtOrWithin(targetPath, sourcePath)
  );
}

/** The cause every member of one cycle group shares: a repeated source, a landing on a path the group still occupies, or neither. */
function groupCause(
  group: readonly PlannedMove[],
): 'duplicate' | 'swap' | 'cycle' {
  const anyPair = (test: (a: PlannedMove, b: PlannedMove) => boolean) =>
    group.some((a, i) => group.some((b, j) => i !== j && test(a, b)));
  if (anyPair((a, b) => samePath(a.sourcePath, b.sourcePath)))
    return 'duplicate';
  if (anyPair((a, b) => samePath(a.targetPath, b.sourcePath))) return 'swap';
  return 'cycle';
}

/**
 * Moves that no execution order can satisfy, with their cause.
 *
 * A move on a cycle of ordering constraints has no valid position; every
 * member of one cycle group (its moves that reach each other both ways) gets
 * the same cause. A move whose target and source contain each other, off
 * every cycle, is `nested`. Moves outside every cycle are not reported, so
 * they stay in the plan. Plans hold few moves, so the transitive closure is
 * computed directly.
 * @param moves - Executable candidate moves, in request order
 * @returns One conflict per conflicting move, by ascending index; `related`
 * lists the other members of its cycle group, ascending, or is empty for
 * `nested`
 */
export function findOrderConflicts(
  moves: readonly PlannedMove[],
): CyclicConflict[] {
  const reaches = moves.map((from, fromIndex) =>
    moves.map((to, toIndex) => fromIndex !== toIndex && mustPrecede(from, to)),
  );
  for (let via = 0; via < moves.length; via += 1)
    for (let from = 0; from < moves.length; from += 1)
      for (let to = 0; to < moves.length; to += 1)
        reaches[from][to] ||= reaches[from][via] && reaches[via][to];
  return moves.flatMap((move, index): CyclicConflict[] => {
    if (reaches[index][index]) {
      const related = moves.flatMap((_, other) =>
        other !== index && reaches[index][other] && reaches[other][index]
          ? [other]
          : [],
      );
      const group = [index, ...related].map((member) => moves[member]);
      return [{ index, cause: groupCause(group), related }];
    }
    return nestsInItself(move) ? [{ index, cause: 'nested', related: [] }] : [];
  });
}
