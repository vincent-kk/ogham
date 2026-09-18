import { pathForCompare, portableIsAbsolute } from '@ogham/cross-platform';

import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';

/**
 * Whether a specifier names a path rather than a package.
 * @param specifier - Raw specifier text
 * @returns True for an absolute path or a `./`- or `../`-prefixed one; a bare
 * `.` or `..` is not path-like
 */
export function isPathLikeSpecifier(specifier: string): boolean {
  const comparable = pathForCompare(specifier);
  return (
    portableIsAbsolute(specifier) ||
    comparable.startsWith(PORTABLE_PATH_MARKERS.CURRENT_PREFIX) ||
    comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX)
  );
}
