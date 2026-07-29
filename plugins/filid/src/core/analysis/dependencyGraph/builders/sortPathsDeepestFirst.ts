/**
 * Order candidate paths so the deepest is tested first — owner resolution wants
 * the most specific container, and a longer path can never be an ancestor of a
 * shorter one. Sorting once here is what keeps lookup cost from multiplying by
 * the candidate count on every reference.
 * @param paths Candidate node or organ paths, in any order.
 * @returns A new array ordered by descending path length.
 */
export function sortPathsDeepestFirst(paths: readonly string[]): string[] {
  return [...paths].sort((left, right) => right.length - left.length);
}
