import { compareByBytes } from '../../../../../lib/compareByBytes.js';
import type {
  NormalizedFileFacts,
  ProjectSnapshot,
} from '../../../../../types/fractal.js';

import type { ReviewScopePaths } from './selectReviewScopePaths.js';

/**
 * The normalized facts of the files a review claims about (spec §9).
 *
 * Frozen with the generation so a verifier compares its own extraction against
 * what this review was judged on, not against a store that moved after it: a
 * review must not be blocked by facts it never saw.
 *
 * `normalizedFacts` already holds one entry per file the facts scope covers,
 * empty where that file has no edge, so this only narrows it to the review's
 * own paths. A scope file missing from the result is one the facts scope
 * excludes — a lockfile, a document — which no record can describe, and
 * freezing an empty entry for it would claim a reading nobody did.
 *
 * Sorted by path because the result is written and digested.
 * @param snapshot - Snapshot the review evidence comes from.
 * @param scopePaths - The review's changed files and their graph neighbours.
 * @returns One entry per in-scope review file, in path order.
 */
export function selectFrozenFacts(
  snapshot: ProjectSnapshot,
  scopePaths: ReviewScopePaths,
): NormalizedFileFacts[] {
  const wanted = new Set([...scopePaths.changed, ...scopePaths.neighbours]);
  return snapshot.normalizedFacts
    .filter((entry) => wanted.has(entry.path))
    .sort((left, right) => compareByBytes(left.path, right.path));
}
