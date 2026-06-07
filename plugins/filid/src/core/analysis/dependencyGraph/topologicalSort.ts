import type { DependencyDAG } from '../../../types/fractal.js';

/**
 * Perform topological sort using Kahn's algorithm.
 * Returns null if a cycle exists.
 */
export function topologicalSort(dag: DependencyDAG): string[] | null {
  if (dag.nodes.size === 0) return [];

  // Calculate in-degree
  const inDegree = new Map<string, number>();
  for (const node of dag.nodes) {
    inDegree.set(node, 0);
  }
  for (const [, targets] of dag.adjacency) {
    for (const target of targets) {
      inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
    }
  }

  // Initialize queue with zero in-degree nodes
  const queue: string[] = [];
  for (const [node, degree] of inDegree) {
    if (degree === 0) queue.push(node);
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    const neighbors = dag.adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If not all nodes were visited, a cycle exists
  if (result.length !== dag.nodes.size) {
    return null;
  }

  return result;
}
