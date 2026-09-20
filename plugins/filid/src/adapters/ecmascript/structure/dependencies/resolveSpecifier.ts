import { statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

import { SOURCE_EXTENSIONS } from '../ecmascriptConventions.js';

/**
 * Resolve a local specifier to the file it loads.
 *
 * Only a trailing supported source extension is swapped, so dotted basenames
 * such as `feature.helpers` keep their name; the literal path and a directory
 * index are tried as well.
 * @param sourceFile - File that holds the specifier
 * @param specifier - Raw specifier text
 * @returns The existing file the specifier loads, or null for a package
 * specifier or a local one that resolves to nothing
 */
export function resolveSpecifier(
  sourceFile: string,
  specifier: string,
): string | null {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;
  const unresolved = resolve(dirname(sourceFile), specifier);
  const extension = extname(unresolved);
  const base = SOURCE_EXTENSIONS.some((candidate) => candidate === extension)
    ? unresolved.slice(0, -extension.length)
    : unresolved;
  const candidates = [
    unresolved,
    ...SOURCE_EXTENSIONS.map((candidate) => base + candidate),
    ...SOURCE_EXTENSIONS.map((candidate) =>
      join(unresolved, `index${candidate}`),
    ),
  ];
  for (const candidate of candidates)
    try {
      if (statSync(candidate, { throwIfNoEntry: false })?.isFile())
        return candidate;
    } catch {
      // A candidate that cannot be stat'd at all — a denied directory, a link
      // loop, a name the filesystem rejects — names no file this analysis can
      // resolve, so it is absent rather than a failure.
      continue;
    }
  return null;
}
