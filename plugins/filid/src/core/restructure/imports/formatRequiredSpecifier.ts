import {
  normalize,
  pathForCompare,
  portableDirname,
  portableRelative,
} from '@ogham/cross-platform';

import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';
import { applySpecifierExtension } from '../specifiers/applySpecifierExtension.js';

/**
 * The specifier `consumerPath` must write to load `targetPath`.
 *
 * A file reference keeps the extension notation of the consumer's current
 * specifier. The result is always path-like: without a leading `./` a
 * relative path reads as a bare package specifier. It is also always separated
 * by `/`, which the language fixes for a module specifier — the host does not,
 * and a relative path computed on Windows arrives separated by `\`.
 * @param consumerPath - Final path of the importing file
 * @param targetPath - Final path of the imported file or directory
 * @param rawSpecifier - Specifier the consumer writes today
 * @param reference - Whether the specifier names a file or a directory
 * @returns A `./`- or `../`-prefixed relative specifier
 */
export function formatRequiredSpecifier(
  consumerPath: string,
  targetPath: string,
  rawSpecifier: string,
  reference: 'file' | 'directory',
): string {
  const relative = normalize(
    portableRelative(portableDirname(consumerPath), targetPath),
  );
  const specifier =
    reference === 'file'
      ? applySpecifierExtension(relative, rawSpecifier)
      : relative;
  const comparable = pathForCompare(specifier);
  if (comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX))
    return specifier;
  if (comparable === PORTABLE_PATH_MARKERS.PARENT)
    return PORTABLE_PATH_MARKERS.PARENT_PREFIX;
  return PORTABLE_PATH_MARKERS.CURRENT_PREFIX + specifier;
}
