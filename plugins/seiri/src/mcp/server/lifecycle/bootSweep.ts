import { sweepStaleTasks } from '../../../core/gates/index.js';
import { sweepStaleActors } from '../../../core/sessionSignals/index.js';

/**
 * Run each owner's idle cleanup independently after the MCP connection.
 * @param projectRoot Host-resolved absolute workspace path.
 * @param now Epoch milliseconds shared by both owner sweeps.
 * @returns Nothing; cleanup failures never escape or write to the transport.
 */
export function bootSweep(projectRoot: string, now: number): void {
  try {
    sweepStaleActors(projectRoot, now);
  } catch {
    // Each owner remains eligible even when the other cleanup fails.
  }
  try {
    sweepStaleTasks(projectRoot, now);
  } catch {
    // Optional cleanup failures are retried on a later server startup.
  }
}
