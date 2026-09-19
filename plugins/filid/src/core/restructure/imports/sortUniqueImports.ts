import { pathForCompare } from '@ogham/cross-platform';

import { RESTRUCTURE_PLAN_HASH_SEPARATOR } from '../../../constants/restructure.js';

/**
 * Collapse import entries that name the same edit and order them for output.
 * @param entries - Rewrites or delegated imports gathered from both directions
 * @param requiredOf - The entry's required specifier or resolved path, compared as given
 * @returns One entry per consumer, current specifier and required value, sorted
 * by consumer path, then current specifier
 */
export function sortUniqueImports<
  T extends { consumerPath: string; currentSpecifier: string },
>(entries: T[], requiredOf: (entry: T) => string): T[] {
  const unique = new Map<string, T>();
  for (const entry of entries)
    unique.set(
      [
        pathForCompare(entry.consumerPath),
        entry.currentSpecifier,
        requiredOf(entry),
      ].join(RESTRUCTURE_PLAN_HASH_SEPARATOR),
      entry,
    );
  return [...unique.values()].sort(
    (left, right) =>
      pathForCompare(left.consumerPath).localeCompare(
        pathForCompare(right.consumerPath),
      ) || left.currentSpecifier.localeCompare(right.currentSpecifier),
  );
}
