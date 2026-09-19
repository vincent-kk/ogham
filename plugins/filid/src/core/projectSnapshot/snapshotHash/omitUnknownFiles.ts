import type { DependencyGraph } from '../../../types/fractal.js';

/**
 * The dependency graph as the snapshot hash reads it: without `unknownFiles`.
 *
 * The list is decided by the snapshot diagnostics, which the hash reads
 * already, so omitting it loses no input and leaves the hash a function of
 * the graph's edges, cycles and certainty alone.
 * @param graph Graph of the snapshot.
 * @returns The graph's other fields in their original order.
 */
export function omitUnknownFiles(
  graph: DependencyGraph,
): Omit<DependencyGraph, 'unknownFiles'> {
  const { unknownFiles: _unknownFiles, ...hashed } = graph;
  return hashed;
}
