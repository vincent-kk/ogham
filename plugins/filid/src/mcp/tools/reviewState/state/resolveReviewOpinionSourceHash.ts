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
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from './reviewStateTypes.js';

/** Read-once outcome for one origin-state.json snapshot, keyed by its resolved path. */
interface OriginStateSnapshot {
  /** Hash of the snapshot bytes, or null when the file is absent. */
  hash: string | null;
  /** Identity-checked origin state for this generation's paths, or null when unusable. */
  origin: ReviewStateRecord | null;
}

/** Snapshot-path-keyed cache avoiding repeated origin-state.json reads across groups. */
export type OriginStateCache = Map<string, OriginStateSnapshot>;

/**
 * Read, hash, and identity-check one origin-state.json snapshot exactly once per path.
 * @param paths Generation paths whose origin snapshot is being resolved.
 * @param cache Path-keyed memoization shared across every group in one call tree.
 * @returns The snapshot's byte hash and identity-checked origin, cached by path.
 */
function loadOriginStateSnapshot(
  paths: ReviewStatePaths,
  cache: OriginStateCache,
): OriginStateSnapshot {
  const snapshotPath = resolveReviewArtifactPath(paths, 'origin-state.json');
  const cached = cache.get(snapshotPath);
  if (cached) return cached;
  const bytes = readUtf8FileIfExistsSync(snapshotPath);
  let snapshot: OriginStateSnapshot;
  if (bytes === null) snapshot = { hash: null, origin: null };
  else {
    let parsed;
    try {
      parsed = readReviewState(snapshotPath);
    } catch {
      parsed = null;
    }
    const origin =
      parsed &&
      !('kind' in parsed) &&
      parsed.projectRoot === paths.projectRoot &&
      parsed.normalizedBranch === paths.normalizedBranch
        ? parsed
        : null;
    snapshot = { hash: computeReviewArtifactHash(bytes), origin };
  }
  cache.set(snapshotPath, snapshot);
  return snapshot;
}

/**
 * Resolve an unchanged opinion's source identity through immutable origin proofs.
 * @param paths Current generation paths containing its origin snapshot.
 * @param group Current group and its validated artifact hashes.
 * @param currentSourceHash Active generation's source hash for fresh opinions.
 * @param depth Number of origin links visited; excessive chains fail closed.
 * @param cache Path-keyed memoization shared across every group in one call tree.
 * @returns The proven opinion source identity, or null when provenance is untrusted.
 */
export function resolveReviewOpinionSourceHash(
  paths: ReviewStatePaths,
  group: ReviewGroup,
  currentSourceHash: string,
  depth = 0,
  cache: OriginStateCache = new Map(),
): string | null {
  if (!group.reusedFrom) return currentSourceHash;
  if (
    depth >= 128 ||
    !group.input ||
    !isReviewInputManifestValid(group.input) ||
    group.reusedFrom.inputHash !== group.input.preparedInputHash
  )
    return null;
  const { hash, origin } = loadOriginStateSnapshot(paths, cache);
  if (hash === null || hash !== group.reusedFrom.stateHash || origin === null)
    return null;
  const prior = origin.groups.find((entry) => entry.id === group.id);
  if (
    !prior?.input ||
    prior.input.preparedInputHash !== group.input.preparedInputHash ||
    !prior.validated.review?.complete ||
    JSON.stringify(prior.validated) !== JSON.stringify(group.validated)
  )
    return null;
  if (group.reusedFrom.paths) {
    const mapping = group.reusedFrom.paths;
    if (
      Object.entries(mapping).some(
        ([oldPath, newPath]) =>
          !prior.fileInputs?.[oldPath] ||
          prior.fileInputs[oldPath].preparedInputHash !==
            group.fileInputs?.[newPath]?.preparedInputHash,
      ) ||
      JSON.stringify(group.opinionUnits) !==
        JSON.stringify(prior.opinionUnits ?? prior.units)
    )
      return null;
    const expectedUnits = prior.units
      .filter((unit) => mapping[unit.path] !== undefined)
      .map((unit) => ({ ...unit, path: mapping[unit.path] }));
    const expectedPaths = Object.fromEntries(
      Object.entries(
        prior.opinionPaths ??
          Object.fromEntries(prior.units.map((unit) => [unit.path, unit.path])),
      )
        .filter(([, path]) => mapping[path] !== undefined)
        .map(([original, path]) => [original, mapping[path]]),
    );
    if (
      JSON.stringify(expectedUnits) !== JSON.stringify(group.units) ||
      JSON.stringify(expectedPaths) !== JSON.stringify(group.opinionPaths)
    )
      return null;
  }
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
    cache,
  );
  return resolved === group.reusedFrom.sourceHash ? resolved : null;
}
