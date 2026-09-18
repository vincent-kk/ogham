import { portableJoin, samePath } from '@ogham/cross-platform';

import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { PlannedMove } from '../../../types/restructure.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

/**
 * Whether a directory move would have nothing left to carry.
 *
 * Every snapshot file under the directory leaves through an inner move, and
 * no other move lands inside it, so the move would relocate an empty
 * directory that the post snapshot cannot show.
 * @param move - A planned move
 * @param otherMoves - The other moves that will run in the same plan
 * @param snapshot - Pre-move snapshot; `peerFiles` lists each node's files
 * @returns True for a directory move emptied by inner moves; false for a file
 * move, a directory no inner move touches, or one that keeps or receives
 * content
 */
export function isVacuousMove(
  move: PlannedMove,
  otherMoves: readonly PlannedMove[],
  snapshot: ProjectSnapshot,
): boolean {
  const nodes = [...snapshot.tree.nodes.values()];
  if (!nodes.some((node) => samePath(node.path, move.sourcePath))) return false;
  const inner = otherMoves.filter(
    ({ sourcePath }) =>
      !samePath(sourcePath, move.sourcePath) &&
      isAtOrWithin(move.sourcePath, sourcePath),
  );
  if (inner.length === 0) return false;
  const landsInside = otherMoves.some(
    ({ targetPath }) =>
      !samePath(targetPath, move.sourcePath) &&
      isAtOrWithin(move.sourcePath, targetPath),
  );
  if (landsInside) return false;
  return nodes
    .filter((node) => isAtOrWithin(move.sourcePath, node.path))
    .flatMap((node) =>
      node.peerFiles.map((file) => portableJoin(node.path, file)),
    )
    .every((file) =>
      inner.some(({ sourcePath }) => isAtOrWithin(sourcePath, file)),
    );
}
