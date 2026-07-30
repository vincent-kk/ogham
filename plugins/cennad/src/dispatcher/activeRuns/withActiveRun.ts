import { performance } from 'node:perf_hooks';

import { runLedger } from './runLedger.js';
import type { ActiveRun, ActiveRunInput } from './types.js';

/**
 * Runs one provider CLI call under a cancellation signal the ledger can reach.
 *
 * The returned signal aborts when either the caller's own signal aborts (an MCP
 * request the host cancelled) or `stopRuns` targets this run. Whichever happens,
 * the spawn tree-kills the CLI instead of leaving it running to its liveness
 * ceiling.
 *
 * @param run Session UUID and provider to file the run under, plus the caller's
 *   cancellation signal when one exists.
 * @param body Performs the spawn with the signal it is handed. Its resolution or
 *   rejection ends the run either way.
 * @returns Whatever `body` resolves to; a rejection propagates unchanged.
 */
export async function withActiveRun<T>(
  run: ActiveRunInput,
  body: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  const { callerSignal } = run;
  if (callerSignal?.aborted) abort();
  else callerSignal?.addEventListener('abort', abort, { once: true });

  // The entry is this run's identity — removed by reference, so a concurrent
  // run of the same session is untouched.
  const entry: ActiveRun = {
    sessionId: run.sessionId,
    provider: run.provider,
    startedAt: performance.now(),
    abort,
  };
  runLedger.add(entry);
  try {
    return await body(controller.signal);
  } finally {
    // Both halves matter: a stale ledger entry would let a later stop target a
    // finished run, and a listener left on the caller's signal outlives this
    // call for as long as the MCP request does.
    runLedger.delete(entry);
    callerSignal?.removeEventListener('abort', abort);
  }
}
