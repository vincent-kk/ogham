import type { ResolutionEpochSnapshot } from './computeResolutionEpoch.js';

/** What moved between two epochs, as `facts-epoch-moved` reports it. */
export interface EpochDifference {
  added: string[];
  removed: string[];
  changedResolutionInputs: string[];
}

/**
 * Name what changed between the epoch a caller held and the current one.
 *
 * The difference is what makes the next action concrete: the caller re-extracts
 * the added paths and learns from the removed ones which files left the tree.
 *
 * @param previous - Snapshot of the epoch the caller submitted against, or null
 * when filid no longer holds one — nothing is claimed rather than guessed.
 * @param current - Snapshot of the project's epoch now.
 * @returns Raw-byte-sorted path lists; all three are empty when `previous` is
 * null.
 */
export function diffEpochSnapshots(
  previous: ResolutionEpochSnapshot | null,
  current: ResolutionEpochSnapshot,
): EpochDifference {
  if (previous === null)
    return { added: [], removed: [], changedResolutionInputs: [] };
  const before = new Set(previous.scannedPaths);
  const after = new Set(current.scannedPaths);
  const beforeHashes = new Map(
    previous.resolutionInputs.map((input) => [input.path, input.contentHash]),
  );
  return {
    added: current.scannedPaths.filter((path) => !before.has(path)),
    removed: previous.scannedPaths.filter((path) => !after.has(path)),
    changedResolutionInputs: current.resolutionInputs
      .filter(
        (input) =>
          !beforeHashes.has(input.path) ||
          beforeHashes.get(input.path) !== input.contentHash,
      )
      .map((input) => input.path),
  };
}
