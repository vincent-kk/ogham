import { portableIsAbsolute } from '@ogham/cross-platform/compat/is-absolute';
import { portableResolve } from '@ogham/cross-platform/compat/resolve';

import { PORTABLE_PATH_MARKERS } from '../../../../../constants/pathMarkers.js';

export function resolveVisitedPath(
  cwd: string,
  rawPath: string,
): { filePath: string; fileDir: string } {
  const filePath = portableIsAbsolute(rawPath)
    ? portableResolve(rawPath)
    : portableResolve(cwd, rawPath);
  return {
    filePath,
    fileDir: portableResolve(filePath, PORTABLE_PATH_MARKERS.PARENT),
  };
}
