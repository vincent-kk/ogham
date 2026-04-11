import type { FractalNode, FractalTree } from '../../../../types/fractal.js';

/**
 * Find a node by path.
 */
export function findNode(
  tree: FractalTree,
  path: string,
): FractalNode | undefined {
  return tree.nodes.get(path);
}
