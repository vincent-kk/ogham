import type { FractalNode, FractalTree } from '../../../../types/fractal.js';

/**
 * Return all fractal/pure-function descendants of the given path (excludes organs).
 */
export function getDescendants(tree: FractalTree, path: string): FractalNode[] {
  const node = tree.nodes.get(path);
  if (!node) return [];

  const result: FractalNode[] = [];
  const queue = [...node.children];

  while (queue.length > 0) {
    const childPath = queue.shift()!;
    const child = tree.nodes.get(childPath);
    if (!child) continue;
    result.push(child);
    queue.push(...child.children);
  }

  return result;
}
