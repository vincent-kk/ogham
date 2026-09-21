import { existsSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { readFrozenFacts } from './readFrozenFacts.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from './reviewStateTypes.js';

/**
 * Check whether every prepare-owned artifact already exists for a resumed state.
 *
 * The frozen facts count as one, and their digest counts with them: a
 * generation whose `facts.json` is gone — or no longer hashes to what the
 * state recorded — has nothing a verifier can compare against, and
 * re-preparing is what puts it back (spec §9). Without the digest check the
 * seal-time refusal would have no way out: prepare would keep reusing the
 * generation holding the file it refuses.
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
  if (
    !existsSync(paths.evidencePath) ||
    !existsSync(paths.sessionPath) ||
    readFrozenFacts(paths.factsPath, state).status === 'unusable'
  )
    return false;
  return state.groups.every((group) =>
    group.rounds === 0
      ? exists(group.opinionPath) && exists(group.verifyBriefPath)
      : exists(group.briefPath) &&
        exists(group.skeletonPath) &&
        group.units.every((unit) => exists(unit.diffPath)),
  );
}
