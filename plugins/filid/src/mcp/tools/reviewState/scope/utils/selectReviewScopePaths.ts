import { portableResolve } from '@ogham/cross-platform';

import { toProjectRelativePath } from '../../../../../lib/toProjectRelativePath.js';
import type { ProjectSnapshot } from '../../../../../types/fractal.js';

/** The changed files of a review and what the graph puts beside them. */
export interface ReviewScopePaths {
  /** Project-relative paths Git reports as changed. */
  changed: Set<string>;
  /** Files a changed file references, and files that reference one, in order. */
  neighbours: string[];
}

/**
 * The files a review claims about: its changes and their graph neighbours.
 *
 * Both the unknown-file partition and the frozen facts are built from this
 * set, so they cannot disagree about what the review looked at. Unknown files
 * are not here: they are judged by name against these paths, which is what
 * `partitionUnknownFiles` does with the result.
 *
 * @param snapshot - Snapshot the review evidence comes from.
 * @param changedPaths - Project-relative paths of the changed files.
 * @returns The changed set and the neighbours the edge evidence names.
 */
export function selectReviewScopePaths(
  snapshot: ProjectSnapshot,
  changedPaths: readonly string[],
): ReviewScopePaths {
  const root = snapshot.projectRoot;
  const changed = new Set(
    changedPaths.map((path) =>
      toProjectRelativePath(root, portableResolve(root, path)),
    ),
  );
  const neighbours = snapshot.dependencyGraph.edges
    .flatMap(({ evidence }) => evidence)
    .flatMap(({ sourceFile, resolvedPath }) => {
      const source = toProjectRelativePath(root, sourceFile);
      const target = toProjectRelativePath(root, resolvedPath);
      return [
        ...(changed.has(source) ? [target] : []),
        ...(changed.has(target) ? [source] : []),
      ];
    });
  return { changed, neighbours };
}
