import { readFileSync } from 'node:fs';

import { portableResolve } from '@ogham/cross-platform';

import { isAtOrWithin } from '../imports/isAtOrWithin.js';

import { isPhysicallyWithin } from './isPhysicallyWithin.js';

/**
 * Read an unknown file's text for the relevance filter, never outside the root.
 *
 * The text is searched for names, never parsed. The path must stay inside the
 * project root both as a string and with every symbolic link followed.
 * @param projectRoot Absolute project root.
 * @param relativePath Project-relative path from the graph's `unknownFiles`.
 * @returns The UTF-8 text, or null when the path leaves the root or cannot be
 *   read; the filter then treats the file as related.
 */
export function readUnknownFileText(
  projectRoot: string,
  relativePath: string,
): string | null {
  const path = portableResolve(projectRoot, relativePath);
  try {
    if (
      !isAtOrWithin(projectRoot, path) ||
      !isPhysicallyWithin(projectRoot, path)
    )
      return null;
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}
