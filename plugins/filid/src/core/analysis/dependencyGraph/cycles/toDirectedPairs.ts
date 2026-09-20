import type { DependencyGraph } from '../../../../types/fractal.js';

import type { DirectedPair } from './types.js';

/**
 * Read a `DependencyGraph`'s node paths and edges as the directed-pair shape
 * `findCycles` and `canonicalizeDirectedGraph` take.
 * @param graph - The graph to read.
 * @returns The graph's node paths, and its edges as `{ from, to }` pairs.
 */
export function toDirectedPairs(graph: DependencyGraph): {
  nodePaths: readonly string[];
  edges: DirectedPair[];
} {
  return {
    nodePaths: graph.nodePaths,
    edges: graph.edges.map((edge) => ({
      from: edge.fromFractalPath,
      to: edge.toFractalPath,
    })),
  };
}
