import { portableIsAbsolute } from '@ogham/cross-platform/compat/is-absolute';
import { pathForCompare } from '@ogham/cross-platform/compat/path-for-compare';
import { portableRelative } from '@ogham/cross-platform/paths/relative';

/**
 * Decide whether a path sits inside a root, comparing portably so the answer
 * does not depend on the host OS path syntax.
 * @param rootPath Absolute path treated as the containing root.
 * @param targetPath Absolute path tested for containment.
 * @returns True when the target is the root itself or sits under it.
 */
export function isPathWithin(rootPath: string, targetPath: string): boolean {
  const remainder = portableRelative(rootPath, targetPath);
  const comparable = pathForCompare(remainder);
  return (
    remainder === '' ||
    (comparable !== '..' &&
      !comparable.startsWith('../') &&
      !portableIsAbsolute(remainder))
  );
}
