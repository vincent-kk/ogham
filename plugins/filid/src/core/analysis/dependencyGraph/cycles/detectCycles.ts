import type {
  DependencyDAG,
  DependencyGraph,
} from '../../../../types/fractal.js';

import { findCycles } from './findCycles.js';
import { toDirectedPairs } from './toDirectedPairs.js';

export function detectCycles(
  graph: DependencyDAG | DependencyGraph,
): string[][] {
  if ('nodePaths' in graph) {
    const pairs = toDirectedPairs(graph);
    return findCycles(pairs.nodePaths, pairs.edges);
  }

  return findCycles(
    [...graph.nodes],
    graph.edges.map((edge) => ({ from: edge.from, to: edge.to })),
  );
}
