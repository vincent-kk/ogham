import {
  pathForCompare,
  portableDirname,
  portableIsAbsolute,
  portableResolve,
  samePath,
} from '@ogham/cross-platform/paths';

import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';

import { stripPathExtension } from './stripPathExtension.js';

function isPathLike(specifier: string): boolean {
  const comparable = pathForCompare(specifier);
  return (
    portableIsAbsolute(specifier) ||
    comparable.startsWith(PORTABLE_PATH_MARKERS.CURRENT_PREFIX) ||
    comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX)
  );
}

/**
 * Whether a path-like specifier denotes `resolvedPath`, compared on the
 * extension-stripped stem.
 *
 * An ecosystem may forbid writing the source file's own extension: TypeScript
 * ESM references a `.ts` file as `.js`, and bundler resolution omits the
 * extension entirely. A byte-exact comparison would therefore reject every real
 * TypeScript import and leave the whole plan unresolved. A stem mismatch — a
 * directory-index reference, for one — stays unsupported rather than guessed.
 */
export function specifierDenotesPath(
  consumerFile: string,
  rawSpecifier: string,
  resolvedPath: string,
): boolean {
  if (!isPathLike(rawSpecifier)) return false;
  const denoted = portableResolve(portableDirname(consumerFile), rawSpecifier);
  return samePath(
    stripPathExtension(denoted),
    stripPathExtension(resolvedPath),
  );
}
