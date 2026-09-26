import { lstatSync, readdirSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

/**
 * Inspect a tree's newest modification without following symbolic links.
 * @param path Absolute entry to inspect.
 * @param excludedPaths Absolute entries whose entire subtrees are ignored.
 * @param includeSelf Include this entry's mtime; false excludes lock-created
 * directory changes while still visiting its children.
 * @returns Newest mtime, or negative infinity for no included entries. Missing
 * entries are skipped; other filesystem failures propagate to the task sweep.
 */
export function newestMtime(
  path: string,
  excludedPaths: string[] = [],
  includeSelf = true,
): number {
  if (excludedPaths.includes(path)) return -Infinity;
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) return -Infinity;
  let newest = includeSelf ? stat.mtimeMs : -Infinity;
  if (!stat.isDirectory()) return newest;
  let names;
  try {
    names = readdirSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return newest;
    throw error;
  }
  for (const name of names)
    newest = Math.max(
      newest,
      newestMtime(portableJoin(path, name), excludedPaths),
    );
  return newest;
}
