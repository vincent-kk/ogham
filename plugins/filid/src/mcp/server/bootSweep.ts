import {
  isPruneDue,
  isSessionPruneDue,
  markPruneRun,
  markSessionPruneRun,
  pruneOldSessions,
  pruneStaleCacheDirs,
} from '../../core/infra/cacheManager/cacheManager.js';

/**
 * Boot-time stale-session sweep — the guaranteed cleanup path now that the
 * SessionEnd hook is gone. On hosts without hooks (Codex, Antigravity) the
 * MCP server boot is the only per-session cleanup point; on Claude it shares
 * the daily-throttle marker gates with the SessionStart hook, so a double
 * run in the same session stays a no-op.
 */
export function bootSweep(cwd: string = process.cwd()): void {
  try {
    if (isSessionPruneDue(cwd)) {
      pruneOldSessions(cwd);
      markSessionPruneRun(cwd);
    }
    if (isPruneDue()) {
      pruneStaleCacheDirs();
      markPruneRun();
    }
  } catch {
    // best-effort: server boot must never fail because of the sweep
  }
}
