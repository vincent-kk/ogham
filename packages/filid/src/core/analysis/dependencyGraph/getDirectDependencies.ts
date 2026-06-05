import type { DependencyDAG } from '../../../types/fractal.js';

/**
 * Return direct dependencies (outgoing edges) of a node.
 * Duplicates are removed.
 */
export function getDirectDependencies(
  dag: DependencyDAG,
  node: string,
): string[] {
  const deps = dag.adjacency.get(node);
  if (!deps) return [];
  return [...new Set(deps)];
}
