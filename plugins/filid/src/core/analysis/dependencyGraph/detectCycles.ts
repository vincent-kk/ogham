import type { DependencyDAG } from '../../../types/fractal.js';

/**
 * Detect cycles using DFS.
 * Returns array of cycle paths. Empty array if no cycles.
 */
export function detectCycles(dag: DependencyDAG): string[][] {
  const WHITE = 0; // Unvisited
  const GRAY = 1; // In progress (on stack)
  const BLACK = 2; // Completed

  const color = new Map<string, number>();
  for (const node of dag.nodes) {
    color.set(node, WHITE);
  }

  const cycles: string[][] = [];
  const path: string[] = [];

  function dfs(node: string): void {
    color.set(node, GRAY);
    path.push(node);

    const neighbors = dag.adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      const c = color.get(neighbor);
      if (c === GRAY) {
        // Cycle found: slice from neighbor to current in path
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
      } else if (c === WHITE) {
        dfs(neighbor);
      }
    }

    path.pop();
    color.set(node, BLACK);
  }

  for (const node of dag.nodes) {
    if (color.get(node) === WHITE) {
      dfs(node);
    }
  }

  return cycles;
}
