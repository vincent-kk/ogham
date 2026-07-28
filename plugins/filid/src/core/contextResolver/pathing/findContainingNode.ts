import type { FractalNode, FractalTree } from '../../../types/fractal.js';

import { isPathWithin } from './isPathWithin.js';

export function findContainingNode(
  tree: FractalTree,
  targetPath: string,
): FractalNode | null {
  return (
    [...tree.nodes.values()]
      .filter((node) => isPathWithin(node.path, targetPath))
      .sort((left, right) => right.path.length - left.path.length)[0] ?? null
  );
}
