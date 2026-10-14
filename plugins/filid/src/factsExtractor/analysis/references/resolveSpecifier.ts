import { statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

import { SOURCE_EXTENSIONS } from '../../../adapters/ecmascript/structure/ecmascriptConventions.js';
import type { ResolutionAlias } from '../../../types/adapters.js';

/**
 * Resolve a local or explicitly substituted specifier to the file it loads.
 *
 * Only a trailing supported source extension is swapped, so dotted basenames
 * such as `feature.helpers` keep their name; the literal path and a directory
 * index are tried as well.
 * @param sourceFile - File that holds the specifier
 * @param specifier - Raw specifier text
 * @param aliases - Validated project substitutions; exact matches precede the longest wildcard prefix.
 * @param projectRoot - Root against which substitution targets resolve.
 * @returns The existing target file, or null for an unmatched external specifier
 * or a matched/local reference with no existing candidate.
 */
export function resolveSpecifier(
  sourceFile: string,
  specifier: string,
  aliases: readonly ResolutionAlias[] = [],
  projectRoot: string = dirname(sourceFile),
): string | null {
  let unresolved: string;
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    unresolved = resolve(dirname(sourceFile), specifier);
  } else {
    const exact = aliases.find((alias) =>
      alias.from === specifier && !alias.from.endsWith('*'),
    );
    const alias = exact ?? aliases
      .filter((candidate) =>
        candidate.from.endsWith('*') && specifier.startsWith(candidate.from.slice(0, -1)),
      )
      .sort((left, right) => right.from.length - left.from.length)[0];
    if (!alias) return null;
    const replaced = alias.from.endsWith('*')
      ? alias.to.slice(0, -1) + specifier.slice(alias.from.length - 1)
      : alias.to;
    unresolved = resolve(projectRoot, replaced);
  }
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
