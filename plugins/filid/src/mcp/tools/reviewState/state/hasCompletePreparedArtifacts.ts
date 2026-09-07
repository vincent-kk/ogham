import { existsSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from './reviewStateTypes.js';

/**
 * Check whether every prepare-owned artifact already exists for a resumed state.
 *
 * @param paths Canonical paths for the branch-scoped review.
 * @param state Persisted prepared state defining group artifact paths.
 * @returns True when prepare can return without reopening rules or diffs.
 */
export function hasCompletePreparedArtifacts(
  paths: ReviewStatePaths,
  state: ReviewStateRecord,
): boolean {
  const exists = (relativePath: string): boolean => {
    const path = resolveContainedPath(paths.reviewDirectory, relativePath);
    assertNoSymlinkDescendantsSync(paths.reviewDirectory, path);
    return existsSync(path);
  };
  if (!existsSync(paths.evidencePath) || !existsSync(paths.sessionPath))
    return false;
  return state.groups.every((group) =>
    group.rounds === 0
      ? exists(group.opinionPath) && exists(group.verifyBriefPath)
      : exists(group.briefPath) &&
        exists(group.skeletonPath) &&
        group.units.every((unit) => exists(unit.diffPath)),
  );
}
