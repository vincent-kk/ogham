import { createHash } from 'node:crypto';
import type { Hash } from 'node:crypto';

import { FACTS_HASH_PREFIX } from '../../../constants/facts.js';

import { hashResolutionInput } from './utils/hashResolutionInput.js';

/** One resolution input and the digest of its bytes, or null when unreadable. */
export interface ResolutionInputDigest {
  path: string;
  contentHash: string | null;
}

/**
 * The path list and resolution-input digests one epoch was computed from.
 *
 * Kept alongside the epoch so a later call can say which paths and inputs moved
 * rather than only that the epoch differs.
 */
export interface ResolutionEpochSnapshot {
  resolutionEpoch: string;
  scannedPaths: readonly string[];
  resolutionInputs: readonly ResolutionInputDigest[];
}

/**
 * Compute the project's current resolution epoch (spec §2.2).
 *
 * The digest covers the scanned path list and the contents of the project's
 * default resolution inputs — never the contents of the scanned files
 * themselves. That is the point of the epoch: editing a file's body leaves
 * every stored record's resolution valid, while adding, deleting or moving a
 * file can change which file a specifier resolves to and so invalidates all of
 * them at once.
 *
 * Inputs a record declares for itself are deliberately absent. Folding them in
 * would make accepting a record change the next epoch, so the second half of a
 * split submission would be refused against an epoch its own first half moved.
 * Those declarations bind their own record instead, checked at submit and at
 * classification.
 *
 * Every element is length-framed before hashing, so no two different lists can
 * produce one digest by running their separators together.
 *
 * @param projectRoot - Absolute project root, used to resolve relative inputs.
 * @param scannedPaths - Project-relative POSIX paths, raw-byte sorted.
 * @param resolutionInputPaths - Default resolution inputs whose bytes enter the
 * digest.
 * @returns The epoch and the inputs it was built from.
 */
export function computeResolutionEpoch(
  projectRoot: string,
  scannedPaths: readonly string[],
  resolutionInputPaths: readonly string[],
): ResolutionEpochSnapshot {
  const resolutionInputs = resolutionInputPaths.map((path) => ({
    path,
    contentHash: hashResolutionInput(projectRoot, path),
  }));
  const digest = createHash('sha256');
  frame(digest, [...scannedPaths]);
  frame(
    digest,
    resolutionInputs.flatMap((input) => [input.path, input.contentHash ?? '']),
  );
  return {
    resolutionEpoch: `${FACTS_HASH_PREFIX}${digest.digest('hex')}`,
    scannedPaths,
    resolutionInputs,
  };
}

/**
 * Feed a list to a digest so its element boundaries cannot be forged.
 * @param digest Hash to update in place.
 * @param values Strings to fold in, in order.
 */
function frame(digest: Hash, values: readonly string[]): void {
  digest.update(`${values.length}\0`);
  for (const value of values)
    digest.update(`${Buffer.byteLength(value, 'utf8')}\0`).update(value, 'utf8');
}
