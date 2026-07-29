import { portableBasename } from '@ogham/cross-platform/compat/basename';

import type { FractalNode } from '../../../../types/fractal.js';

/**
 * Keep the nodes whose directory name matches exactly — the query "where does
 * this organ name appear across the tree?".
 * @param nodes Snapshot nodes to narrow.
 * @param nameFilter Directory name to match exactly; undefined keeps every node.
 * @returns The matching nodes, empty when nothing matched.
 */
export function filterNodesByName(
  nodes: readonly FractalNode[],
  nameFilter: string | undefined,
): FractalNode[] {
  if (nameFilter === undefined) return [...nodes];
  return nodes.filter((node) => portableBasename(node.path) === nameFilter);
}
