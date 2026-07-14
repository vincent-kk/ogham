import { tryProjectRoot } from '@ogham/cross-platform/host-paths';

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
 *
 * The session-scoped prune is project-scoped, so it is skipped when no project
 * root resolves — sweeping the plugin's install directory would be worse than
 * sweeping nothing. The stale-cache prune is global and always runs.
 */
export function bootSweep(cwd?: string): void {
  try {
    const root = tryProjectRoot(cwd);
    if (root !== null && isSessionPruneDue(root)) {
      pruneOldSessions(root);
      markSessionPruneRun(root);
    }
    if (isPruneDue()) {
      pruneStaleCacheDirs();
      markPruneRun();
    }
  } catch {
    // best-effort: server boot must never fail because of the sweep
  }
}
