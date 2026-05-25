import { buildFractalTree } from '../../../../core/tree/fractal-tree/fractal-tree.js';
import type {
  FractalNavigateInput,
  FractalNavigateOutput,
} from '../fractal-navigate.js';

export function handleTree(input: FractalNavigateInput): FractalNavigateOutput {
  const tree = buildFractalTree(input.entries);
  return {
    tree: {
      root: tree.root,
      depth: tree.depth,
      totalNodes: tree.totalNodes,
      nodes: Array.from(tree.nodes.values()),
    },
  };
}
