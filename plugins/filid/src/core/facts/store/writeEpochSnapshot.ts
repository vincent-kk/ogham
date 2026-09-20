import { writeFileAtomicallySync } from '@ogham/cross-platform';

import type { ResolutionEpochSnapshot } from '../epoch/computeResolutionEpoch.js';

/**
 * Record the epoch filid just computed, so the next call can diff against it.
 *
 * Written while the tree stands still and again when a submit is accepted: the
 * snapshot is the baseline the difference lists are measured from, so it may
 * not move while a caller is still holding the epoch it read. A failed write is
 * swallowed — losing the hint costs a caller its `added`/`removed` lists, which
 * is not worth failing an otherwise complete call for.
 *
 * @param path - Absolute path of the snapshot file.
 * @param snapshot - Epoch and the inputs it was computed from.
 */
export function writeEpochSnapshot(
  path: string,
  snapshot: ResolutionEpochSnapshot,
): void {
  try {
    writeFileAtomicallySync(path, JSON.stringify(snapshot));
  } catch {
    return;
  }
}
