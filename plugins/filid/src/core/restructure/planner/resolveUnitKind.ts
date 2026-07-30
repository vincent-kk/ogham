import { samePath } from '@ogham/cross-platform';

import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { RESTRUCTURE_UNIT_KINDS } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { RestructureUnitKind } from '../../../types/restructure.js';

export function resolveUnitKind(
  snapshot: ProjectSnapshot,
  sourcePath: string,
): RestructureUnitKind {
  const sourceNode = [...snapshot.tree.nodes.values()].find((node) =>
    samePath(node.path, sourcePath),
  );
  if (sourceNode?.type === NODE_TYPES.FRACTAL)
    return RESTRUCTURE_UNIT_KINDS.FRACTAL;
  if (
    sourceNode?.type === NODE_TYPES.ORGAN ||
    sourceNode?.type === NODE_TYPES.PURE_FUNCTION
  )
    return RESTRUCTURE_UNIT_KINDS.ORGAN;
  return RESTRUCTURE_UNIT_KINDS.FILE;
}
