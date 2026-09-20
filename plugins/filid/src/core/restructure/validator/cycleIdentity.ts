import { pathForCompare } from '@ogham/cross-platform';

/**
 * A cycle's identity: the sorted, de-duplicated set of its member owner paths.
 *
 * Identifying a cycle by its strongly connected component, not by a
 * representative route, keeps the identity stable when a restructure renames
 * or relocates one of the owners without changing the topology.
 * @param nodes Owner paths of the cycle's strongly connected component.
 * @returns A stable key; equal for components over the same owners.
 */
export function cycleIdentity(nodes: readonly string[]): string {
  return [...new Set(nodes.map((node) => pathForCompare(node)))]
    .sort()
    .join('\n');
}
