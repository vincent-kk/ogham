import { existsSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import type {
  ReviewCheckpointArtifacts,
  ReviewStatePaths,
  ReviewStateRecord,
} from './reviewStateTypes.js';

/**
 * Resolve one state-owned artifact while enforcing the review-directory guard.
 *
 * @param paths Canonical branch-scoped review paths.
 * @param relativePath State-stored review-directory-relative artifact path.
 * @returns Guarded absolute artifact path.
 */
function resolveArtifactPath(
  paths: ReviewStatePaths,
  relativePath: string,
): string {
  const absolutePath = resolveContainedPath(
    paths.reviewDirectory,
    relativePath,
  );
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, absolutePath);
  return absolutePath;
}

/**
 * Read bounded resume-relevant artifact presence without changing review state.
 *
 * @param paths Canonical paths for the prepared branch review.
 * @param state Persisted v2 state defining required group artifacts.
 * @returns Global brief/diff readiness and creation-ordered group file facts.
 */
export function readReviewArtifactPresence(
  paths: ReviewStatePaths,
  state: ReviewStateRecord,
): ReviewCheckpointArtifacts {
  const exists = (relativePath: string): boolean =>
    existsSync(resolveArtifactPath(paths, relativePath));
  return {
    briefs: state.groups.every((group) =>
      group.rounds === 0
        ? exists(group.verifyBriefPath)
        : exists(group.briefPath) &&
          (!group.validated.review?.complete || exists(group.verifyBriefPath)),
    ),
    diffs: state.groups.every((group) =>
      group.units.every((unit) => exists(unit.diffPath)),
    ),
    groups: state.groups.map((group) => ({
      id: group.id,
      opinion: exists(group.opinionPath),
      verify: exists(group.verifyPath),
    })),
  };
}
