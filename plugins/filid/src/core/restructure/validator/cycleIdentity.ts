import { pathForCompare } from '@ogham/cross-platform';

/**
 * A cycle's identity: the sorted set of its `(fromFractalPath, toFractalPath)` pairs.
 *
 * Two routes through the same edges are one cycle whichever owner they start
 * from, and a route relocated through a plan's moves compares with the route
 * the post-execution graph reports.
 * @param route Owner paths, the first repeated at the end.
 * @returns A stable key; equal for routes over the same edges.
 */
export function cycleIdentity(route: readonly string[]): string {
  const pairs = route
    .slice(1)
    .map(
      (to, index) => `${pathForCompare(route[index])}\0${pathForCompare(to)}`,
    );
  return [...new Set(pairs)].sort().join('\n');
}
