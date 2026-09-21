import { pathForCompare } from '@ogham/cross-platform';

import { compareByBytes } from '../../../lib/compareByBytes.js';

/**
 * Deduplicate paths by their comparable form and sort them.
 * @param paths - Absolute paths, possibly repeated or differently cased where the platform folds case
 * @returns The first spelling of each path, ordered by `pathForCompare`
 */
export function sortUniquePaths(paths: readonly string[]): string[] {
  const unique = new Map(paths.map((path) => [pathForCompare(path), path]));
  return [...unique.entries()]
    .sort(([left], [right]) => compareByBytes(left, right))
    .map(([, path]) => path);
}
