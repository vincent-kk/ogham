import type { FractalNode, FractalTree } from '../../../../types/fractal.js';

/**
 * Collect every node reachable from `searchRoot`, walking BOTH edge types.
 * `buildFractalTree` files organ dirs under `organs[]` and everything else
 * under `children[]`, so a children-only walk never reaches an organ node —
 * and organ peer files (utils/, helpers/, scanner/, constants/) hold most
 * implementation code.
 */
export function collectSubtreeNodes(
  tree: FractalTree,
  searchRoot: string,
): Map<string, FractalNode> {
  const allNodes = new Map<string, FractalNode>();
  const queue = [searchRoot];

  while (queue.length > 0) {
    const nodePath = queue.shift()!;
    if (allNodes.has(nodePath)) continue;

    const node = tree.nodes.get(nodePath);
    if (!node) continue;

    allNodes.set(nodePath, node);
    queue.push(...node.children, ...node.organs);
  }

  return allNodes;
}
