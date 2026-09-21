import {
  pathForCompare,
  portableIsAbsolute,
  portableRelative,
  samePath,
} from '@ogham/cross-platform';

import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';

/**
 * Whether `targetPath` is `parentPath` itself or sits under it, compared
 * portably so the answer does not depend on host path syntax.
 * @param parentPath - Absolute path treated as the container
 * @param targetPath - Absolute path tested for containment
 * @returns True for the container itself or any path beneath it
 */
export function isAtOrWithin(parentPath: string, targetPath: string): boolean {
  if (samePath(parentPath, targetPath)) return true;
  const relative = portableRelative(parentPath, targetPath);
  const comparable = pathForCompare(relative);
  return (
    comparable !== PORTABLE_PATH_MARKERS.PARENT &&
    !comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX) &&
    !portableIsAbsolute(relative)
  );
}
