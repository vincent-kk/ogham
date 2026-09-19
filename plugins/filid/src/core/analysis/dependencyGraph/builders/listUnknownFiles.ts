import { toProjectRelativePath } from '../../../../lib/toProjectRelativePath.js';
import type { UnknownFile } from '../../../../types/fractal.js';

/**
 * Merge attributed causes into the graph's sorted unknown-file list.
 * @param projectRoot Root the absolute source paths are made relative to.
 * @param causesBySource Causes keyed by absolute source file.
 * @param seeds Entries the collector attributed outside the references.
 * @returns One entry per project-relative path with sorted unique causes, sorted by path.
 */
export function listUnknownFiles(
  projectRoot: string,
  causesBySource: ReadonlyMap<string, ReadonlySet<string>>,
  seeds: readonly UnknownFile[],
): UnknownFile[] {
  const merged = new Map<string, Set<string>>();
  const add = (path: string, causes: Iterable<string>) => {
    const entry = merged.get(path) ?? new Set<string>();
    for (const cause of causes) entry.add(cause);
    merged.set(path, entry);
  };
  for (const seed of seeds) add(seed.path, seed.causes);
  for (const [sourceFile, causes] of causesBySource)
    add(toProjectRelativePath(projectRoot, sourceFile), causes);
  return [...merged]
    .map(([path, causes]) => ({ path, causes: [...causes].sort() }))
    .sort((left, right) => left.path.localeCompare(right.path));
}
