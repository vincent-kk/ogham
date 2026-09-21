import {
  pathForCompare,
  portableDirname,
  portableIsAbsolute,
  portableRelative,
  portableResolve,
} from '@ogham/cross-platform';

import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';

import { isPathLikeSpecifier } from './isPathLikeSpecifier.js';

/**
 * The directory a path-like specifier names when it loads a file inside it,
 * as `../utils` loads `utils/index.ts`.
 * @param consumerFile - File that holds the specifier
 * @param rawSpecifier - Specifier text
 * @param resolvedPath - File the specifier resolved to
 * @returns The named directory when it strictly contains `resolvedPath`;
 * otherwise null
 */
export function specifierDenotesDirectoryOf(
  consumerFile: string,
  rawSpecifier: string,
  resolvedPath: string,
): string | null {
  if (!isPathLikeSpecifier(rawSpecifier)) return null;
  const denoted = portableResolve(portableDirname(consumerFile), rawSpecifier);
  const remainder = portableRelative(denoted, resolvedPath);
  const comparable = pathForCompare(remainder);
  const inside =
    comparable !== PORTABLE_PATH_MARKERS.EMPTY &&
    comparable !== PORTABLE_PATH_MARKERS.PARENT &&
    !comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX) &&
    !portableIsAbsolute(remainder);
  return inside ? denoted : null;
}
