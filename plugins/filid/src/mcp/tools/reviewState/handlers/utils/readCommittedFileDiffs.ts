import { REVIEW_STATE_GIT } from '../../../../../constants/reviewState.js';
import { executeReviewGit } from '../../hash/executeReviewGit.js';

import { batchDiffPaths } from './batchDiffPaths.js';
import { splitDiffByPath } from './splitDiffByPath.js';

/**
 * Read the committed diff of each path over one range, spawning Git per
 * batch of paths instead of per path.
 *
 * Sections Git prints with an unquoted header are attributed exactly; when a
 * batch contains any section that matches no path, every path that batch
 * left unattributed is re-read on its own. For a path without pathspec
 * wildcards the result equals a per-path read.
 *
 * @param projectRoot Absolute repository root used as the Git working directory.
 * @param range Revision range arguments, e.g. `['<base>..HEAD']`.
 * @param paths Paths to read; a path Git printed nothing for maps to `''`.
 * @returns Verbatim single-path diff text per requested path.
 */
export async function readCommittedFileDiffs(
  projectRoot: string,
  range: readonly string[],
  paths: readonly string[],
): Promise<Map<string, string>> {
  const diffs = new Map<string, string>();
  for (const batch of batchDiffPaths(paths)) {
    const output = await executeReviewGit(projectRoot, [
      REVIEW_STATE_GIT.DIFF,
      '--no-renames',
      ...range,
      REVIEW_STATE_GIT.END_OF_OPTIONS,
      ...batch,
    ]);
    const split = splitDiffByPath(output, batch);
    for (const path of batch)
      diffs.set(
        path,
        split.matched.get(path) ??
          (split.unmatchedSections > 0
            ? await readSinglePathDiff(projectRoot, range, path)
            : ''),
      );
  }
  return diffs;
}

function readSinglePathDiff(
  projectRoot: string,
  range: readonly string[],
  path: string,
): Promise<string> {
  return executeReviewGit(projectRoot, [
    REVIEW_STATE_GIT.DIFF,
    '--no-renames',
    ...range,
    REVIEW_STATE_GIT.END_OF_OPTIONS,
    path,
  ]);
}
