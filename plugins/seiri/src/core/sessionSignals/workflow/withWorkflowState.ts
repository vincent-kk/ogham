import { existsSync, rmdirSync, unlinkSync } from 'node:fs';

import { logHookFailure, portableJoin } from '@ogham/cross-platform';

import { CONFIG_DIR, SESSIONS_DIR } from '../../../constants/files.js';
import type {
  WorkflowIdentity,
  WorkflowState,
} from '../../../types/workflow.js';
import { acquireLockDir } from '../../utils/acquireLockDir.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';
import { writeAtomically } from '../../utils/writeAtomically.js';

import { prepareDirectory } from './prepareDirectory.js';
import { readState } from './readState.js';

/** Seven days without observations retires this actor, never user ledgers. */
const ACTOR_TTL = 7 * 24 * 60 * 60 * 1000;
/** Incomplete invocations expire independently of actor activity. */
const CALL_TTL = 24 * 60 * 60 * 1000;

/**
 * Run one optional actor transaction. Lock failure skips all effects.
 * @param identity Host-normalized actor identity.
 * @param create Whether a trusted boundary may create metadata.
 * @param mutate Callback under the actor lock; ledger effects take their lock inside it.
 * @param revokeOnFailure Persist a revocation marker if boundary invalidation fails.
 * @returns Callback result only after state is persisted, or undefined on failure.
 */
export function withWorkflowState<T>(
  identity: WorkflowIdentity,
  create: boolean,
  mutate: (state: WorkflowState) => T,
  revokeOnFailure = false,
): T | undefined {
  const dir = portableJoin(
    findRepoRoot(identity.root),
    CONFIG_DIR,
    SESSIONS_DIR,
  );
  const path = portableJoin(dir, `${identity.actor}.json`);
  const lock = `${path}.lock`;
  const revoked = `${path}.revoked`;
  let held = false;
  try {
    if (!existsSync(path) && !create) return undefined;
    if (create && !prepareDirectory(identity.root)) return undefined;
    held = acquireLockDir(lock);
    if (!held) throw new Error('Actor lock unavailable');
    let state = readState(path);
    if (state && Date.now() - state.lastObservedAt > ACTOR_TTL) {
      unlinkSync(path);
      if (existsSync(revoked)) unlinkSync(revoked);
      state = undefined;
    }
    if (existsSync(revoked)) {
      logHookFailure('seiri', 'workflow-state', 'Actor remains revoked; use a new host session to resume optional assistance.');
      return undefined;
    }
    if (!state && !create) return undefined;
    state ??= {
      version: 1,
      generation: 0,
      lastObservedAt: Date.now(),
      invocations: {},
      seen: [],
    };
    for (const [key, invocation] of Object.entries(state.invocations))
      if (!invocation || Date.now() - invocation.startedAt > CALL_TTL)
        delete state.invocations[key];
    const result = mutate(state);
    state.lastObservedAt = Date.now();
    writeAtomically(path, JSON.stringify(state));
    return result;
  } catch {
    logHookFailure(
      'seiri',
      'workflow-state',
      'Actor transaction skipped: lock or storage unavailable.',
    );
    if (revokeOnFailure && existsSync(path)) {
      try {
        writeAtomically(revoked, 'revoked');
      } catch {
        logHookFailure(
          'seiri',
          'workflow-state',
          'Revocation could not be persisted; reset participation after storage recovers.',
        );
      }
    }
    return undefined;
  } finally {
    if (held) {
      try {
        rmdirSync(lock);
      } catch {
        /* A later call handles an abandoned lock. */
      }
    }
  }
}
