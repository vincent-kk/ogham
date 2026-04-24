import {
  buildFractalTree,
  findNode,
} from '../../../../core/tree/fractal-tree/fractal-tree.js';
import type { FractalNavigateInput, FractalNavigateOutput } from '../fractal-navigate.js';

export function handleSiblingList(input: FractalNavigateInput): FractalNavigateOutput {
  const tree = buildFractalTree(input.entries);

  // Find parent path
  const lastSlash = input.path.lastIndexOf('/');
  const parentPath = lastSlash > 0 ? input.path.slice(0, lastSlash) : '';
  const parentNode = findNode(tree, parentPath);

  if (!parentNode) {
    return { siblings: [] };
  }

  // children and organs are string[] (paths), resolve them to node info
  const allChildPaths = [...parentNode.children, ...parentNode.organs];
  const siblings = allChildPaths
    .filter((p) => p !== input.path)
    .map((p) => {
      const node = tree.nodes.get(p);
      return node
        ? { name: node.name, path: node.path, type: node.type }
        : { name: p.split('/').pop() ?? '', path: p, type: 'directory' };
    });

  return { siblings };
}
