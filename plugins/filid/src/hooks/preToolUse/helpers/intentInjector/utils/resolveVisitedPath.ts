import { portableIsAbsolute, portableResolve } from '@ogham/cross-platform';

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
