import { REVIEW_SKIP_REASONS } from '../../../../../constants/reviewState.js';
import { readHeadTreeEntries } from '../../hash/readHeadTreeEntries.js';
import type {
  ReviewScopeFile,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

import { readReviewRenames } from './readReviewRenames.js';

/**
 * Retain previously reviewed paths that reverted out of the original PR range.
 * @param projectRoot Git repository used for committed path existence.
 * @param files Current merge-base-to-HEAD roster.
 * @param previous Previous prepared scope, absent on the first review.
 * @returns Roster with explicit deletions and reverts, collapsing Git rename pairs.
 */
export async function extendIncrementalReviewFiles(
  projectRoot: string,
  files: readonly ReviewScopeFile[],
  previous: ReviewStateRecord | null,
): Promise<ReviewScopeFile[]> {
  const renames = await readReviewRenames(
    projectRoot,
    previous?.incremental?.headCommit,
  );
  const current = files
    .filter((file) => !renames.has(file.path))
    .map((file) => ({
      ...file,
      skipReason:
        file.change === 'D' && file.skipReason === REVIEW_SKIP_REASONS.DELETED
          ? null
          : file.skipReason,
    }));
  const missing =
    previous?.scope.files.filter(
      (file) =>
        file.skipReason === null &&
        !renames.has(file.path) &&
        !current.some((entry) => entry.path === file.path),
    ) ?? [];
  const head = await readHeadTreeEntries(
    projectRoot,
    missing.map((file) => file.path),
  );
  for (const file of missing)
    current.push({
      ...file,
      change: head.has(file.path) ? 'M' : 'D',
      skipReason: null,
    });
  return current;
}
