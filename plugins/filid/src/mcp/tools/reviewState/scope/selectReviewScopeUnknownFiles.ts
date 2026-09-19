import { portableResolve } from '@ogham/cross-platform';

import {
  classifyRelevanceTarget,
  partitionUnknownFiles,
} from '../../../../core/index.js';
import { toProjectRelativePath } from '../../../../lib/toProjectRelativePath.js';
import type {
  ProjectSnapshot,
  UnknownFilePartition,
} from '../../../../types/fractal.js';

/**
 * Split the snapshot's unknown files by the review scope.
 *
 * The scope is the changed files, the files they reference and the files that
 * reference them, by the graph's edge evidence. An unknown file cannot show
 * what it references, so it also enters the scope when it spells a changed
 * file's name as a path token — the restructure relevance filter's rule: a
 * plain file by its stem, a module entry by its directory's name with that
 * directory's subtree in scope. A reference that does not spell the name
 * slips through.
 * @param snapshot Snapshot the review evidence comes from.
 * @param changedPaths Project-relative paths of the changed files.
 * @param readText Text of a project-relative file, or null when it cannot be read.
 * @returns Unknown files inside the review scope and those outside it.
 */
export function selectReviewScopeUnknownFiles(
  snapshot: ProjectSnapshot,
  changedPaths: readonly string[],
  readText: (relativePath: string) => string | null,
): UnknownFilePartition {
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
  return partitionUnknownFiles(
    snapshot.dependencyGraph.unknownFiles,
    [...changed].map((path) => ({
      path,
      kind: classifyRelevanceTarget(
        snapshot.tree,
        portableResolve(root, path),
        false,
      ),
    })),
    readText,
    neighbours,
  );
}
