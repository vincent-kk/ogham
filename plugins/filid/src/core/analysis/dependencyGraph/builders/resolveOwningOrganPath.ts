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
 * @returns the organ path, or `null` when `filePath` is an owner peer rather
 *   than an organ member.
 */
export function resolveOwningOrganPath(
  organPaths: readonly string[],
  ownerPath: string,
  filePath: string,
): string | null {
  return (
    [...organPaths]
      .sort((left, right) => right.length - left.length)
      .find(
        (organPath) =>
          contains(ownerPath, organPath) && contains(organPath, filePath),
      ) ?? null
  );
}
