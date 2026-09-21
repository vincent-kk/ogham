import { portableResolve } from '@ogham/cross-platform';

import {
  classifyRelevanceTarget,
  partitionUnknownFiles,
} from '../../../../core/index.js';
import type {
  ProjectSnapshot,
  UnknownFilePartition,
} from '../../../../types/fractal.js';

import type { ReviewScopePaths } from './utils/selectReviewScopePaths.js';

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
 * @param scopePaths The review's changed files and their graph neighbours,
 * computed once by the caller — deriving them here would walk every edge's
 * evidence a second time on every prepare and every handoff.
 * @param readText Text of a project-relative file, or null when it cannot be read.
 * @returns Unknown files inside the review scope and those outside it.
 */
export function selectReviewScopeUnknownFiles(
  snapshot: ProjectSnapshot,
  scopePaths: ReviewScopePaths,
  readText: (relativePath: string) => string | null,
): UnknownFilePartition {
  const root = snapshot.projectRoot;
  const { changed, neighbours } = scopePaths;
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
