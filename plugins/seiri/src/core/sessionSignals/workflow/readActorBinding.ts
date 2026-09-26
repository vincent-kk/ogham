import { existsSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

import { CONFIG_DIR, SESSIONS_DIR } from '../../../constants/files.js';
import type {
  WorkflowBinding,
  WorkflowIdentity,
} from '../../../types/workflow.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';

import { isActorFresh } from './isActorFresh.js';
import { readState } from './readState.js';

/**
 * Read another actor's active binding without a lock or a write.
 * @param identity Host-normalized identity of the actor to read (typically
 *   the parent's `host + session_id + 'main'` actor).
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @returns The actor's binding when its state file is structurally valid,
 *   within {@link isActorFresh}'s TTL, not `.revoked` or `.revoked-suspend`,
 *   not lock-held, and `state === 'active'`; `undefined` on any other
 *   outcome, including a read or parse failure.
 */
export function readActorBinding(
  identity: WorkflowIdentity,
  now: number,
): WorkflowBinding | undefined {
  try {
    const path = portableJoin(
      findRepoRoot(identity.root),
      CONFIG_DIR,
      SESSIONS_DIR,
      `${identity.actor}.json`,
    );
    if (
      existsSync(`${path}.revoked`) ||
      existsSync(`${path}.revoked-suspend`) ||
      existsSync(`${path}.lock`)
    )
      return undefined;
    const state = readState(path);
    if (!state || !isActorFresh(state, now)) return undefined;
    return state.binding?.state === 'active' ? state.binding : undefined;
  } catch {
    return undefined;
  }
}
