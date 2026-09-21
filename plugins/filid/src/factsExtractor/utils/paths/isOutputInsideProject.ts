import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import { isInsideRoot } from './isInsideRoot.js';

/**
 * Whether an output path would land inside the project tree.
 *
 * Judged on the string and on the real location of its nearest existing
 * ancestor, so a link into the tree is caught before anything is written.
 * @param projectRoot Absolute project root.
 * @param realRoot `projectRoot` with its links followed.
 * @param outputPath Output path as given.
 * @returns True when the output would sit at or below the root.
 */
export function isOutputInsideProject(
  projectRoot: string,
  realRoot: string,
  outputPath: string,
): boolean {
  const path = resolve(outputPath);
  if (isInsideRoot(projectRoot, path)) return true;
  let existing = path;
  const rest: string[] = [];
  while (!existsSync(existing)) {
    rest.unshift(basename(existing));
    existing = dirname(existing);
  }
  return isInsideRoot(realRoot, join(realpathSync(existing), ...rest));
}
