import { portableIsAbsolute } from '@ogham/cross-platform/compat/is-absolute';
import { pathForCompare } from '@ogham/cross-platform/compat/path-for-compare';
import { portableRelative } from '@ogham/cross-platform/paths/relative';

/**
 * Deepest candidate node that contains a path.
 * @param nodePathsDeepestFirst Candidates ordered by descending path length —
 * pass them through `sortPathsDeepestFirst`. An unordered list returns the first
 * container found rather than the most specific one.
 * @param targetPath Path whose owning node is wanted.
 * @returns The owning node path, or null when no candidate contains it.
 */
export function resolveOwnerPath(
  nodePathsDeepestFirst: readonly string[],
  targetPath: string,
): string | null {
  return (
    nodePathsDeepestFirst.find((candidate) => {
      const remainder = portableRelative(candidate, targetPath);
      const comparable = pathForCompare(remainder);
      return (
        remainder === '' ||
        (comparable !== '..' &&
          !comparable.startsWith('../') &&
          !portableIsAbsolute(remainder))
      );
    }) ?? null
  );
}
