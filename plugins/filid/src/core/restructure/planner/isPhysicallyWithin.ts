import {
  canonicalizeTargetPathSync,
  portableDirname,
} from '@ogham/cross-platform';

import { isAtOrWithin } from '../imports/isAtOrWithin.js';

import { isMissingPathError } from './isMissingPathError.js';
import { isSymlinkLoopError } from './isSymlinkLoopError.js';

/**
 * Whether a path, with every symbolic link on it followed, stays inside the project root.
 *
 * A missing suffix is judged by the links before it. Where a component is a
 * file (`ENOTDIR`), nothing past it can be reached, so the nearest ancestor
 * that resolves decides. A symbolic link loop cannot be shown to stay inside,
 * so it counts as outside.
 * @param projectRoot - Absolute project root, itself canonicalized before comparing
 * @param path - Absolute path to judge; it need not exist
 * @returns True when the path's real location is at or inside the root's real
 * location; false when it lies outside or runs through a symbolic link loop
 * @throws Filesystem errors other than a missing path or a symbolic link loop
 */
export function isPhysicallyWithin(projectRoot: string, path: string): boolean {
  const root = canonicalizeTargetPathSync(projectRoot, projectRoot);
  for (let at = path; ; at = portableDirname(at))
    try {
      return isAtOrWithin(root, canonicalizeTargetPathSync(root, at));
    } catch (error) {
      if (isSymlinkLoopError(error)) return false;
      if (isMissingPathError(error) && portableDirname(at) !== at) continue;
      throw error;
    }
}
