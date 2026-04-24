import { buildFractalTree } from '../../../../core/tree/fractal-tree/fractal-tree.js';
import type { FractalNavigateInput, FractalNavigateOutput } from '../fractal-navigate.js';

export function handleTree(input: FractalNavigateInput): FractalNavigateOutput {
  const tree = buildFractalTree(input.entries);
  tree.nodesList = Array.from(tree.nodes.values());
  return { tree };
}
