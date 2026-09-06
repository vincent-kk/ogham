import {
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { computeReviewArtifactHash } from '../hash/computeReviewArtifactHash.js';
import { isReviewInputManifestValid } from '../hash/isReviewInputManifestValid.js';

import { readReviewState } from './readReviewState.js';
import { resolveReviewArtifactPath } from './resolveReviewArtifactPath.js';
import { resolveReviewGenerationPaths } from './resolveReviewGenerationPaths.js';
import type { ReviewGroup } from './reviewGroupTypes.js';
import type { ReviewStatePaths } from './reviewStateTypes.js';

/**
 * Resolve an unchanged opinion's source identity through immutable origin proofs.
 * @param paths Current generation paths containing its origin snapshot.
 * @param group Current group and its validated artifact hashes.
 * @param currentSourceHash Active generation's source hash for fresh opinions.
 * @param depth Number of origin links visited; excessive chains fail closed.
 * @returns The proven opinion source identity, or null when provenance is untrusted.
 */
export function resolveReviewOpinionSourceHash(
  paths: ReviewStatePaths,
  group: ReviewGroup,
  currentSourceHash: string,
  depth = 0,
): string | null {
  if (!group.reusedFrom) return currentSourceHash;
  if (
    depth >= 128 ||
    !group.input ||
    !isReviewInputManifestValid(group.input) ||
    group.reusedFrom.inputHash !== group.input.preparedInputHash
  )
    return null;
  const snapshotPath = resolveReviewArtifactPath(paths, 'origin-state.json');
  const bytes = readUtf8FileIfExistsSync(snapshotPath);
  if (
    bytes === null ||
    computeReviewArtifactHash(bytes) !== group.reusedFrom.stateHash
  )
    return null;
  let origin;
  try {
    origin = readReviewState(snapshotPath);
  } catch {
    return null;
  }
  if (
    !origin ||
    'kind' in origin ||
    origin.projectRoot !== paths.projectRoot ||
    origin.normalizedBranch !== paths.normalizedBranch
  )
    return null;
  const prior = origin.groups.find((entry) => entry.id === group.id);
  if (
    !prior?.input ||
    prior.input.preparedInputHash !== group.input.preparedInputHash ||
    !prior.validated.review?.complete ||
    JSON.stringify(prior.validated) !== JSON.stringify(group.validated)
  )
    return null;
  const originPaths = origin.generationId
    ? resolveReviewGenerationPaths(paths, origin.generationId)
    : {
        ...paths,
        reviewDirectory: resolveContainedPath(
          paths.reviewRoot,
          paths.normalizedBranch,
        ),
      };
  const resolved = resolveReviewOpinionSourceHash(
    originPaths,
    prior,
    origin.sourceHash,
    depth + 1,
  );
  return resolved === group.reusedFrom.sourceHash ? resolved : null;
}
