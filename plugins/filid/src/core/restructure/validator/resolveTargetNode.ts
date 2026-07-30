import { portableDirname, samePath } from '@ogham/cross-platform';

import { RESTRUCTURE_UNIT_KINDS } from '../../../constants/restructure.js';
import type { FractalNode, ProjectSnapshot } from '../../../types/fractal.js';
import type { MoveInstruction } from '../../../types/restructure.js';

export function resolveTargetNode(
  snapshot: ProjectSnapshot,
  move: MoveInstruction,
): FractalNode | null {
  const targetNodePath =
    move.unitKind === RESTRUCTURE_UNIT_KINDS.FILE
      ? portableDirname(move.targetPath)
      : move.targetPath;
  return (
    [...snapshot.tree.nodes.values()].find((node) =>
      samePath(node.path, targetNodePath),
    ) ?? null
  );
}
