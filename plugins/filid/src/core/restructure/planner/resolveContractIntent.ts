import { samePath } from '@ogham/cross-platform';

import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { CONTRACT_INTENTS } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { ContractIntent } from '../../../types/restructure.js';

/**
 * Infer an independent boundary only from its intent and declared entry surface.
 * @param snapshot - Shared planning evidence; no live files are read.
 * @param sourcePath - Absolute unit path whose owner evidence is considered.
 * @param requested - Explicit caller decision, which takes precedence over inference.
 * @returns The explicit or evidenced contract intent, otherwise unknown.
 */
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
    sourceNode.entryPoints.length > 0
  )
    return CONTRACT_INTENTS.INDEPENDENT;
  return CONTRACT_INTENTS.UNKNOWN;
}
