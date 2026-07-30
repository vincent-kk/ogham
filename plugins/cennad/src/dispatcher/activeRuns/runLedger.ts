import type { ActiveRun } from './types.js';

/**
 * In-flight provider CLI runs, keyed by cennad session UUID.
 *
 * Module state on purpose: the writer (`withActiveRun`, called from a
 * dispatcher) and the readers (`stopRuns`, called from the
 * `stop_conversation` tool and from the server's shutdown handler) have no
 * call path between them, so the ledger is the only thing they can share. It
 * covers this MCP server process alone — one Claude session — and holds
 * nothing across restarts.
 */
export const runLedger = new Map<string, ActiveRun>();
