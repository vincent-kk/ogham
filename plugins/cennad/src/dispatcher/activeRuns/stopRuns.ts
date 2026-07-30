import { performance } from 'node:perf_hooks';

import { runLedger } from './runLedger.js';
import type { StopFilter, StoppedRun } from './types.js';

/**
 * Force-stops in-flight provider CLI runs and reports which ones were killed.
 *
 * Each match's abort reaches the spawn, which SIGKILLs the CLI's whole process
 * group — the CLI's own children included. Work in progress is lost and partial
 * output is not recovered. The ledger holds only what this server process
 * spawned, so a run started by another Claude session is not visible here.
 *
 * @param filter Which runs to stop; an omitted field matches everything, so no
 *   argument stops every run in flight.
 * @returns One entry per killed run, empty when nothing matched.
 */
export function stopRuns(filter: StopFilter = {}): StoppedRun[] {
  const now = performance.now();
  // Snapshot first: aborting is what eventually removes entries, and iterating
  // the live map while that happens is not worth reasoning about.
  const targets = [...runLedger.values()].filter(
    (run) =>
      (filter.sessionId === undefined || run.sessionId === filter.sessionId) &&
      (filter.provider === undefined || run.provider === filter.provider),
  );
  for (const run of targets) run.abort();
  return targets.map((run) => ({
    session_id: run.sessionId,
    provider: run.provider,
    elapsed_ms: Math.round(now - run.startedAt),
  }));
}
