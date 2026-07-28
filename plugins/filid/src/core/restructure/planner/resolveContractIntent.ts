import { samePath } from '@ogham/cross-platform/paths';

import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { CONTRACT_INTENTS } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { ContractIntent } from '../../../types/restructure.js';

export function resolveContractIntent(
  snapshot: ProjectSnapshot,
  sourcePath: string,
  requested?: ContractIntent,
): ContractIntent {
  if (requested && requested !== CONTRACT_INTENTS.UNKNOWN) return requested;
  const sourceNode = [...snapshot.tree.nodes.values()].find((node) =>
    samePath(node.path, sourcePath),
  );
  if (
    sourceNode?.type === NODE_TYPES.FRACTAL &&
    sourceNode.hasIntentMd &&
    sourceNode.hasDetailMd &&
    sourceNode.entryPoints.length > 0
  )
    return CONTRACT_INTENTS.INDEPENDENT;
  return CONTRACT_INTENTS.UNKNOWN;
}
