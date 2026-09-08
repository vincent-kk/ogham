import { REVIEW_STATE_GIT } from '../../../../../constants/reviewState.js';
import { executeReviewGit } from '../../hash/executeReviewGit.js';

import { splitDiffByPath } from './splitDiffByPath.js';

/**
 * Paths per `git diff` invocation. Keeps every command line far below the
 * Windows limit while still collapsing a typical roster into one process.
 */
const PATHS_PER_BATCH = 200;

/**
 * Read the committed diff of each path over one range, spawning Git per
 * batch of paths instead of per path.
 *
 * Sections Git prints with an unquoted header are attributed exactly; when a
 * batch contains a quoted header, every path that batch left unattributed is
 * re-read on its own, so the result equals a per-path read for every path.
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
  for (let start = 0; start < paths.length; start += PATHS_PER_BATCH) {
    const batch = paths.slice(start, start + PATHS_PER_BATCH);
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
