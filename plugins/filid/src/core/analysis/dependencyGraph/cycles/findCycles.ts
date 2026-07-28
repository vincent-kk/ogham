import { canonicalizeDirectedGraph } from './canonicalizeDirectedGraph.js';
import { findDirectedCycleRoute } from './findDirectedCycleRoute.js';
import { findStronglyConnectedComponents } from './findStronglyConnectedComponents.js';
import type { DirectedPair } from './types.js';

export function findCycles(
  nodePaths: readonly string[],
  edges: readonly DirectedPair[],
): string[][] {
  const graph = canonicalizeDirectedGraph(nodePaths, edges);
  return findStronglyConnectedComponents(graph)
    .filter((component) => component.length > 1)
    .map((component) => findDirectedCycleRoute(component, graph.adjacency))
    .filter((route): route is string[] => route !== null)
    .sort((left, right) => left[0]!.localeCompare(right[0]!));
}
