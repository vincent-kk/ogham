import { existsSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

/**
 * Check whether every reviewer-facing brief already exists for a resumed state.
 *
 * @param paths - Canonical paths for the branch-scoped review.
 * @param state - Persisted state defining reviewer brief paths.
 * @returns True when rule bodies are unnecessary for this resume pass.
 */
export function hasAllReviewBriefs(
  paths: ReviewStatePaths,
  state: ReviewStateRecord,
): boolean {
  return state.groups.every((group) => {
    if (group.rounds === 0) return true;
    const path = resolveContainedPath(paths.reviewDirectory, group.briefPath);
    assertNoSymlinkDescendantsSync(paths.reviewDirectory, path);
    return existsSync(path);
  });
}
