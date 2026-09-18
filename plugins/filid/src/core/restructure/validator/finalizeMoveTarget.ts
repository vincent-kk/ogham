import type {
  MoveInstruction,
  PlannedMove,
} from '../../../types/restructure.js';
import { relocateThroughMoves } from '../imports/relocateThroughMoves.js';

/**
 * The instruction as the post snapshot must show it: its target and required
 * artifacts carried along by every move that runs after it.
 * @param move - An instruction of the plan
 * @param orderedMoves - The plan's `moves`, in execution order
 * @param fromIndex - First move that runs after `move` lands
 * @returns A copy whose `targetPath` and artifact paths are final
 */
export function finalizeMoveTarget(
  move: MoveInstruction,
  orderedMoves: readonly PlannedMove[],
  fromIndex: number,
): MoveInstruction {
  return {
    ...move,
    targetPath: relocateThroughMoves(move.targetPath, orderedMoves, fromIndex),
    requiredArtifacts: move.requiredArtifacts.map((artifact) => ({
      ...artifact,
      path: relocateThroughMoves(artifact.path, orderedMoves, fromIndex),
    })),
  };
}
