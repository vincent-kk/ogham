import type { DependencyGraph } from '../../../../types/fractal.js';

import { canonicalizeDirectedGraph } from './canonicalizeDirectedGraph.js';
import { findStronglyConnectedComponents } from './findStronglyConnectedComponents.js';
import { toDirectedPairs } from './toDirectedPairs.js';

/**
 * Find the graph's multi-node strongly connected components.
 * @param graph - The graph to read.
 * @returns The node paths of each strongly connected component with more
 *   than one member; single-node components are omitted.
 */
export function listCyclicComponents(graph: DependencyGraph): string[][] {
  const pairs = toDirectedPairs(graph);
  const canonical = canonicalizeDirectedGraph(pairs.nodePaths, pairs.edges);
  return findStronglyConnectedComponents(canonical).filter(
    (component) => component.length > 1,
  );
}
