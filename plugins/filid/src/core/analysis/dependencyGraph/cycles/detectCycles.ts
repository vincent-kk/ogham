import type { DependencyDAG, DependencyGraph } from '../../../../types/fractal.js';

import { findCycles } from './findCycles.js';

export function detectCycles(
  graph: DependencyDAG | DependencyGraph,
): string[][] {
  if ('nodePaths' in graph)
    return findCycles(
      graph.nodePaths,
      graph.edges.map((edge) => ({
        from: edge.fromFractalPath,
        to: edge.toFractalPath,
      })),
    );

  return findCycles(
    [...graph.nodes],
    graph.edges.map((edge) => ({ from: edge.from, to: edge.to })),
  );
}
