import type { ActiveRun } from './types.js';

/**
 * In-flight provider CLI runs.
 *
 * A set, not a map keyed by session: `continue_conversation` takes its session
 * id from the caller, so two calls can name the same session at once. Keyed by
 * session, the second registration would evict the first — leaving it running
 * with nothing able to stop it — and whichever finished first would remove the
 * other's entry. Identity is the run.
 *
 * Module state on purpose: the writer (`withActiveRun`, called from a
 * dispatcher) and the readers (`stopRuns`, called from the
 * `stop_conversation` tool and from the server's shutdown handler) have no
 * call path between them, so the ledger is the only thing they can share. It
 * covers this MCP server process alone — one Claude session — and holds
 * nothing across restarts.
 */
export const runLedger = new Set<ActiveRun>();
