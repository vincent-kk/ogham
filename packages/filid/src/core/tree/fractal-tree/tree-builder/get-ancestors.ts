import type { FractalNode, FractalTree } from '../../../../types/fractal.js';

/**
 * Return ancestor nodes from the given path to the root (excluding self).
 * Order: leaf → root.
 */
export function getAncestors(tree: FractalTree, path: string): FractalNode[] {
  const ancestors: FractalNode[] = [];
  const node = tree.nodes.get(path);
  if (!node) return ancestors;

  let current = node.parent;
  while (current !== null) {
    const ancestor = tree.nodes.get(current);
    if (!ancestor) break;
    ancestors.push(ancestor);
    current = ancestor.parent;
  }

  return ancestors;
}
