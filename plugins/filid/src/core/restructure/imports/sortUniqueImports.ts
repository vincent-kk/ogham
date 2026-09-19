import { pathForCompare } from '@ogham/cross-platform';

import { RESTRUCTURE_PLAN_HASH_SEPARATOR } from '../../../constants/restructure.js';
import type { ImportRequirement } from '../../../types/restructure.js';

/**
 * Collapse import requirements that name the same edit and order them for output.
 * @param entries - Requirements or preserved imports gathered from both directions
 * @returns One entry per consumer, current specifier and required file, sorted
 * by consumer path, then current specifier
 */
export function sortUniqueImports(
  entries: ImportRequirement[],
): ImportRequirement[] {
  const unique = new Map<string, ImportRequirement>();
  for (const entry of entries)
    unique.set(
      [
        pathForCompare(entry.consumerPath),
        entry.currentSpecifier,
        pathForCompare(entry.requiredResolvedPath),
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
