import { portableIsAbsolute } from '@ogham/cross-platform/compat/is-absolute';
import { pathForCompare } from '@ogham/cross-platform/compat/path-for-compare';
import { portableRelative } from '@ogham/cross-platform/paths/relative';

function contains(parentPath: string, childPath: string): boolean {
  const remainder = portableRelative(parentPath, childPath);
  const comparable = pathForCompare(remainder);
  return (
    remainder !== '' &&
    comparable !== '..' &&
    !comparable.startsWith('../') &&
    !portableIsAbsolute(remainder)
  );
}

/**
 * Deepest organ that holds `filePath` and itself sits inside `ownerPath`.
 *
 * An organ can also be an ancestor of a fractal, so containment inside the
 * owner is required — otherwise a file in `skills/setup/` would report the
 * enclosing `skills/` organ as its owner's compartment.
 *
 * @param organPathsDeepestFirst Organ candidates ordered by descending path
 *   length — pass them through `sortPathsDeepestFirst`. An unordered list
 *   returns the first enclosing organ rather than the deepest.
 * @param ownerPath Fractal that must contain the organ.
 * @param filePath Path whose owning organ is wanted.
 * @returns the organ path, or `null` when `filePath` is an owner peer rather
 *   than an organ member.
 */
export function resolveOwningOrganPath(
  organPathsDeepestFirst: readonly string[],
  ownerPath: string,
  filePath: string,
): string | null {
  return (
    organPathsDeepestFirst.find(
      (organPath) =>
        contains(ownerPath, organPath) && contains(organPath, filePath),
    ) ?? null
  );
}
