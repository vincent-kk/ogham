import { portableJoin } from '@ogham/cross-platform';

import { CONFIG_DIR, SESSIONS_DIR } from '../../../constants/files.js';
import type { WorkflowIdentity } from '../../../types/workflow.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';

import { isActorFresh } from './isActorFresh.js';
import { readState } from './readState.js';

/**
 * Whether a child actor's boundary about to run is its first: no state
 * file yet, one past its TTL, or a stored generation of `0`. Read before
 * `observeBoundary` mutates the same file, without a lock — a locked or
 * failed read counts as first, matching a fresh actor.
 * @param identity Host-normalized identity of the child actor.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @returns `true` when this is the child's first boundary, else `false`.
 */
export function isFirstChildTurn(
  identity: WorkflowIdentity,
  now: number,
): boolean {
  try {
    const path = portableJoin(
      findRepoRoot(identity.root),
      CONFIG_DIR,
      SESSIONS_DIR,
      `${identity.actor}.json`,
    );
    const state = readState(path);
    return !state || !isActorFresh(state, now) || state.generation === 0;
  } catch {
    return true;
  }
}
