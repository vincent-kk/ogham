import type { DependencyDAG, DependencyEdge } from '../../../types/fractal.js';

/**
 * Build a DAG (Directed Acyclic Graph) from an edge array.
 * Returns node set, edge array, and adjacency list.
 */
export function buildDAG(edges: DependencyEdge[]): DependencyDAG {
  const nodes = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    nodes.add(edge.from);
    nodes.add(edge.to);

    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, []);
    }
    adjacency.get(edge.from)!.push(edge.to);

    if (!adjacency.has(edge.to)) {
      adjacency.set(edge.to, []);
    }
  }

  return { nodes, edges, adjacency };
}
