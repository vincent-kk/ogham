import { appendErrorLogSafe } from '../../../core/errorLog/operations/appendErrorLogSafe.js';
import type { HookConcernResult } from '../../../types/dispatch.js';

/**
 * Run a synchronous concern in isolation. Before consolidation each concern
 * ran in its own process, so a crash never affected siblings; now they share
 * one process, so a throw must be caught here, logged, and degraded to
 * `{ continue: true }` rather than aborting the remaining concerns.
 */
export function safeConcern(
  cwd: string | undefined,
  hook: string,
  run: () => HookConcernResult,
): HookConcernResult {
  try {
    return run();
  } catch (error) {
    appendErrorLogSafe(cwd ?? process.cwd(), {
      hook,
      error: String(error),
      timestamp: new Date().toISOString(),
    });
    return { continue: true };
  }
}

/** Async variant for git-spawning concerns (vaultCommitter, changelogDebt). */
export async function safeConcernAsync(
  cwd: string | undefined,
  hook: string,
  run: () => Promise<HookConcernResult>,
): Promise<HookConcernResult> {
  try {
    return await run();
  } catch (error) {
    appendErrorLogSafe(cwd ?? process.cwd(), {
      hook,
      error: String(error),
      timestamp: new Date().toISOString(),
    });
    return { continue: true };
  }
}
