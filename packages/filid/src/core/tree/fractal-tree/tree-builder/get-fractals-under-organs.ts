import type { FractalNode, FractalTree } from '../../../../types/fractal.js';
import { getDescendants } from './get-descendants.js';

/**
 * Return all fractal/pure-function nodes embedded inside organ directories
 * within the subtree rooted at `path`. Each node is returned at most once.
 *
 * Use this to detect fractal nodes that are unreachable via normal
 * children traversal because they sit inside organ boundaries.
 *
 * Algorithm (iterative BFS over organ boundaries):
 *  1. Enqueue all organ paths reachable from node.organs[]
 *  2. For each organ dequeued:
 *     a. Collect its fractal/pure-function children[] and their getDescendants()
 *     b. Enqueue nested organs from its organs[] (for deeper organ chains)
 *     c. Enqueue organs of each fractal child (organ-inside-fractal-inside-organ)
 *  3. A visited Set prevents duplicate collection and infinite loops
 */
export function getFractalsUnderOrgans(
  tree: FractalTree,
  path: string,
): FractalNode[] {
  const node = tree.nodes.get(path);
  if (!node) return [];

  const result: FractalNode[] = [];
  const seen = new Set<string>();
  const organQueue = [...node.organs];

  while (organQueue.length > 0) {
    const organPath = organQueue.shift()!;
    if (seen.has(organPath)) continue;
    seen.add(organPath);

    const organ = tree.nodes.get(organPath);
    if (!organ) continue;

    // fractal/pure-function children inside this organ
    for (const childPath of organ.children) {
      if (seen.has(childPath)) continue;
      const child = tree.nodes.get(childPath);
      if (!child) continue;

      // collect this fractal child
      seen.add(childPath);
      result.push(child);

      // collect its normal fractal descendants (via children[])
      for (const desc of getDescendants(tree, childPath)) {
        if (!seen.has(desc.path)) {
          seen.add(desc.path);
          result.push(desc);
        }
      }

      // also search organs inside this fractal child
      for (const nestedOrgan of child.organs) {
        if (!seen.has(nestedOrgan)) organQueue.push(nestedOrgan);
      }
    }

    // nested organs inside this organ (organ chain: organ > organ > fractal)
    for (const nestedOrgan of organ.organs) {
      if (!seen.has(nestedOrgan)) organQueue.push(nestedOrgan);
    }
  }

  return result;
}
