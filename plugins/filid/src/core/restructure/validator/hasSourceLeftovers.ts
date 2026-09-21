import { portableJoin } from '@ogham/cross-platform';

import type { ProjectSnapshot } from '../../../types/fractal.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

/**
 * Whether a vacated source still holds a file that no reoccupying move put there.
 * @param snapshot - Post-execution snapshot
 * @param sourcePath - Source of a move that other moves land inside
 * @param reoccupants - Final targets of the other moves, each strictly inside `sourcePath`
 * @returns True when some file under `sourcePath` lies outside every reoccupying target
 */
export function hasSourceLeftovers(
  snapshot: ProjectSnapshot,
  sourcePath: string,
  reoccupants: readonly string[],
): boolean {
  return [...snapshot.tree.nodes.values()]
    .flatMap((node) =>
      node.peerFiles.map((file) => portableJoin(node.path, file)),
    )
    .some(
      (file) =>
        isAtOrWithin(sourcePath, file) &&
        !reoccupants.some((target) => isAtOrWithin(target, file)),
    );
}
