import { writeFileAtomicallySync } from '@ogham/cross-platform';

import type { ResolutionEpochSnapshot } from '../epoch/computeResolutionEpoch.js';

/**
 * Record the epoch filid just computed, so the next call can diff against it.
 *
 * Written on every status and every submit: a caller that reads an epoch and
 * comes back after the tree moved is the case the difference lists serve, and
 * that caller's first call is usually status. A failed write is swallowed —
 * losing the hint costs a caller its `added`/`removed` lists, which is not worth
 * failing an otherwise complete call for.
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
