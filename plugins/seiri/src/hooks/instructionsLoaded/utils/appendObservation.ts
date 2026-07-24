import { appendFileSync, mkdirSync, statSync, truncateSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform/compat';
import { pluginCache } from '@ogham/cross-platform/paths';

import { OBSERVATION_LOG } from '../../../constants/files.js';
import { PLUGIN_NAME } from '../../../constants/plugin.js';

/** Newest records win once the log reaches this size; older ones are dropped. */
const SIZE_CAP_BYTES = 512 * 1024;

/** Absolute path of the instruction-load log. */
export function observationLogPath(): string {
  return portableJoin(pluginCache(PLUGIN_NAME), OBSERVATION_LOG);
}

/**
 * Append one instruction-load record as a JSON line.
 *
 * This is seiri's only channel for observing whether its own rules
 * actually reach the model. The repository owns the truth about the code;
 * seiri has to own the truth about whether seiri is working.
 *
 * Records carry `cwd` and `session_id`, so one shared log can be filtered
 * per project or worktree without a separate file per checkout.
 *
 * Failures are swallowed: an observability side effect must never be able
 * to disturb the session it is observing.
 */
export function appendObservation(record: Record<string, unknown>): void {
  try {
    const path = observationLogPath();
    mkdirSync(pluginCache(PLUGIN_NAME), { recursive: true });

    // Truncating rather than rotating: this log answers "is delivery
    // happening now", so a recent window is all it ever needs to hold.
    try {
      if (statSync(path).size > SIZE_CAP_BYTES) truncateSync(path, 0);
    } catch {
      // No log yet — the append below creates it.
    }

    appendFileSync(path, `${JSON.stringify(record)}\n`);
  } catch {
    // Observation is never worth a failed hook.
  }
}
