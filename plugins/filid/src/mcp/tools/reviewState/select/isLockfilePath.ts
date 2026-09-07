import { portableBasename } from '@ogham/cross-platform';

/**
 * Determine whether a changed path has one of the configured lockfile names.
 * @param path Repository-relative changed path.
 * @param basenames Exact lockfile basenames accepted by review configuration.
 * @returns True when the final path segment exactly matches a configured name.
 */
export function isLockfilePath(
  path: string,
  basenames: readonly string[],
): boolean {
  return basenames.includes(portableBasename(path));
}
