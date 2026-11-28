import { existsSync } from 'node:fs';

import {
  logHookFailure,
  portableJoin,
  readUtf8FileIfExistsSync,
  removeFileIfExistsSync,
  withFileLockSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { CONFIG_DIR, SESSIONS_DIR } from '../../../constants/files.js';
import type {
  WorkflowIdentity,
  WorkflowState,
} from '../../../types/workflow.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';

import { isActorFresh } from './isActorFresh.js';
import { readState } from './readState.js';
import { reportWorkflowFailure } from './withWorkflowState/reportWorkflowFailure.js';

/** Incomplete invocations expire independently of actor activity. */
const CALL_TTL = 24 * 60 * 60 * 1000;

/** Options narrowing one actor transaction beyond identity, dial and time. */
interface WithWorkflowStateOptions<Failure> {
  /** Result returned only when the transaction throws; omitted callers keep undefined. */
  failureResult?: Failure;
  /** Persist a revocation marker if this transaction fails to commit. */
  revokeOnFailure?: boolean;
  /**
   * Set only by a boundary transaction (`observeBoundary`):
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
 * Delete a marker only if its current content still matches the token this
 * transaction captured at lock-acquire time.
 * @param markerPath Marker file to conditionally delete.
 * @param token This transaction's own capture, or `undefined` if it saw none.
 */
function deleteMarkerIfUnchanged(
  markerPath: string,
  token: string | undefined,
): void {
  if (token !== undefined && readUtf8FileIfExistsSync(markerPath) === token)
    removeFileIfExistsSync(markerPath);
}

/**
 * Run one optional actor transaction. A failed boundary may leave isolation markers.
 * @param identity Host-normalized actor identity.
 * @param create Directory preparer when an entry request may create
 *   metadata; `false` otherwise. Removes orphan quarantine markers under
 *   the actor lock when the actor state file is absent.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @param mutate Callback under the actor lock; ledger effects take their lock inside it.
 * @param options Quarantine policy and an optional result distinguishing exceptions from absent state.
 * @returns Callback result only after state is persisted; undefined for absent state,
 *   or the configured failure result (default undefined) when the transaction throws.
 */
export function withWorkflowState<T, Failure = undefined>(
  identity: WorkflowIdentity,
  create: false | ((root: string) => string | undefined),
  now: number,
  mutate: (state: WorkflowState) => T,
  options: WithWorkflowStateOptions<Failure> = {},
): T | Failure | undefined {
  const { revokeOnFailure = false, recover } = options;
  const dir = portableJoin(
    findRepoRoot(identity.root),
    CONFIG_DIR,
    SESSIONS_DIR,
  );
  const path = portableJoin(dir, `${identity.actor}.json`);
  const revoked = `${path}.revoked`;
  const revokedSuspend = `${path}.revoked-suspend`;
  const failure = () => {
    reportWorkflowFailure(path, revokeOnFailure, recover?.suspend);
    return options.failureResult;
  };
  try {
    if (!create && !existsSync(path)) return undefined;
    const prepareBeforeLock = create && !existsSync(dir);
    if (prepareBeforeLock && !create(identity.root)) return undefined;
    const locked = withFileLockSync(
      path,
      () => {
        try {
          if (create && !prepareBeforeLock && !create(identity.root))
            return undefined;
          if (create && !existsSync(path))
            for (const marker of [revoked, revokedSuspend])
              removeFileIfExistsSync(marker);

          let state = existsSync(path) ? readState(path) : undefined;
          if (state && !isActorFresh(state, now)) {
            removeFileIfExistsSync(path);
            removeFileIfExistsSync(revoked);
            removeFileIfExistsSync(revokedSuspend);
            state = undefined;
          }
          const revokedToken = readUtf8FileIfExistsSync(revoked) ?? undefined;
          const suspendToken =
            readUtf8FileIfExistsSync(revokedSuspend) ?? undefined;
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
          writeFileAtomicallySync(path, JSON.stringify(state));
          if (recover) {
            deleteMarkerIfUnchanged(revoked, revokedToken);
            deleteMarkerIfUnchanged(revokedSuspend, suspendToken);
          }
          return result;
        } catch {
          return failure();
        }
      },
      { timeoutMs: 500, staleMs: 5_000 },
    );
    return locked.acquired ? locked.value : failure();
  } catch {
    return failure();
  }
}
