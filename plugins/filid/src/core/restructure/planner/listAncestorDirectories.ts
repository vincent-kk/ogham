import { portableDirname, samePath } from '@ogham/cross-platform';

import { isAtOrWithin } from '../imports/isAtOrWithin.js';

/**
 * Directories between a path and the project root, the path's parent first.
 * @param projectRoot - Absolute project root
 * @param path - Absolute path inside the root
 * @returns Strict ancestors of `path` at or within the root, nearest first and the root last
 */
export function listAncestorDirectories(
  projectRoot: string,
  path: string,
): string[] {
  const ancestors: string[] = [];
  for (
    let directory = portableDirname(path);
    isAtOrWithin(projectRoot, directory);
    directory = portableDirname(directory)
  ) {
    ancestors.push(directory);
    if (samePath(directory, projectRoot)) break;
  }
  return ancestors;
}
