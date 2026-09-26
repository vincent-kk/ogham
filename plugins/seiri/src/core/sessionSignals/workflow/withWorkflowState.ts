import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, rmdirSync, unlinkSync } from 'node:fs';

import { logHookFailure, portableJoin } from '@ogham/cross-platform';

import { CONFIG_DIR, SESSIONS_DIR } from '../../../constants/files.js';
import type {
  WorkflowIdentity,
  WorkflowState,
} from '../../../types/workflow.js';
import { acquireLockDir } from '../../utils/acquireLockDir.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';
import { writeAtomically } from '../../utils/writeAtomically.js';

import { isActorFresh } from './isActorFresh.js';
import { readState } from './readState.js';

/** Incomplete invocations expire independently of actor activity. */
const CALL_TTL = 24 * 60 * 60 * 1000;

/** Options narrowing one actor transaction beyond identity, dial and time. */
interface WithWorkflowStateOptions {
  /** Persist a revocation marker if this transaction fails to commit. */
  revokeOnFailure?: boolean;
  /**
   * Set only by a boundary transaction (`observeBoundary`, `suspendActor`):
   * proceed despite an existing quarantine marker, apply any pending
   * suspend-intent marker to an existing binding before `mutate` runs, and
   * — on a successful commit — delete each marker this call itself saw at
   * lock-acquire time, but only if its content is still the same token (a
   * concurrent failing transaction may have rewritten it meanwhile).
   * `suspend` records this boundary's own suspend intent, persisted to the
   * sticky marker if this same transaction goes on to fail.
   */
  recover?: { suspend: boolean };
}

/**
 * Read a marker file's content, or `undefined` when it does not exist.
 * @param markerPath Marker file to read.
 * @returns The marker's current content, or `undefined` if it is absent.
 */
function readMarkerToken(markerPath: string): string | undefined {
  return existsSync(markerPath) ? readFileSync(markerPath, 'utf8') : undefined;
}

/**
 * Delete a marker only if its current content still matches the token this
 * transaction captured at lock-acquire time.
 * @param markerPath Marker file to conditionally delete.
 * @param token This transaction's own capture, or `undefined` if it saw none.
 */
function deleteMarkerIfUnchanged(
  markerPath: string,
  token: string | undefined,
): void {
  if (token !== undefined && readMarkerToken(markerPath) === token)
    unlinkSync(markerPath);
}

/**
 * Run one optional actor transaction. Lock failure skips all effects.
 * @param identity Host-normalized actor identity.
 * @param create Directory preparer when a trusted boundary may create
 *   metadata; `false` otherwise.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @param mutate Callback under the actor lock; ledger effects take their lock inside it.
 * @param options `revokeOnFailure` and `recover`, kept as one options object
 *   so a growing parameter list stays legible at the call site.
 * @returns Callback result only after state is persisted, or undefined on failure.
 */
export function withWorkflowState<T>(
  identity: WorkflowIdentity,
  create: false | ((root: string) => string | undefined),
  now: number,
  mutate: (state: WorkflowState) => T,
  options: WithWorkflowStateOptions = {},
): T | undefined {
  const { revokeOnFailure = false, recover } = options;
  const dir = portableJoin(
    findRepoRoot(identity.root),
    CONFIG_DIR,
    SESSIONS_DIR,
  );
  const path = portableJoin(dir, `${identity.actor}.json`);
  const lock = `${path}.lock`;
  const revoked = `${path}.revoked`;
  const revokedSuspend = `${path}.revoked-suspend`;
  let held = false;
  try {
    if (!existsSync(path) && !create) return undefined;
    if (create && !create(identity.root)) return undefined;
    held = acquireLockDir(lock);
    if (!held) throw new Error('Actor lock unavailable');
    let state = readState(path);
    if (state && !isActorFresh(state, now)) {
      unlinkSync(path);
      if (existsSync(revoked)) unlinkSync(revoked);
      if (existsSync(revokedSuspend)) unlinkSync(revokedSuspend);
      state = undefined;
    }
    const revokedToken = readMarkerToken(revoked);
    const suspendToken = readMarkerToken(revokedSuspend);
    if (
      (revokedToken !== undefined || suspendToken !== undefined) &&
      !recover
    ) {
      logHookFailure(
        'seiri',
        'workflow-state',
        'Actor is quarantined; only its next boundary transaction may recover it.',
      );
      return undefined;
    }
    if (!state && !create) return undefined;
    state ??= {
      version: 1,
      generation: 0,
      lastObservedAt: now,
      invocations: {},
      seen: [],
    };
    if (recover && suspendToken !== undefined && state.binding)
      state.binding.state = 'suspended';
    for (const [key, invocation] of Object.entries(state.invocations))
      if (!invocation || now - invocation.startedAt > CALL_TTL)
        delete state.invocations[key];
    const result = mutate(state);
    state.lastObservedAt = now;
    writeAtomically(path, JSON.stringify(state));
    if (recover) {
      deleteMarkerIfUnchanged(revoked, revokedToken);
      deleteMarkerIfUnchanged(revokedSuspend, suspendToken);
    }
    return result;
  } catch {
    logHookFailure(
      'seiri',
      'workflow-state',
      'Actor transaction skipped: lock or storage unavailable.',
    );
    if (revokeOnFailure && existsSync(path)) {
      try {
        writeAtomically(revoked, randomUUID());
        if (recover?.suspend) writeAtomically(revokedSuspend, randomUUID());
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
