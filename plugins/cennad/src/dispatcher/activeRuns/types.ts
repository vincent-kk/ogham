import type { Provider } from '../../types/index.js';

/** One provider CLI run this server process spawned and has not yet settled. */
export interface ActiveRun {
  /** cennad session UUID — the ledger key, unique per in-flight run. */
  sessionId: string;
  /** Which CLI is running, so a stop can target one provider. */
  provider: Provider;
  /** `performance.now()` at registration, used to report how long it ran. */
  startedAt: number;
  /**
   * Aborts this run's spawn signal, which tree-kills the CLI and its children.
   * Calling it more than once is harmless — `AbortController` ignores repeats.
   */
  abort: () => void;
}

/** What `withActiveRun` needs to put a run in the ledger. */
export interface ActiveRunInput {
  /** cennad session UUID this run belongs to. */
  sessionId: string;
  /** Which CLI is about to be spawned. */
  provider: Provider;
  /**
   * The MCP request's cancellation signal, when the caller supplied one. Its
   * abort is forwarded to the spawn; absent, only `stopRuns` and the liveness
   * limits can end the run.
   */
  callerSignal?: AbortSignal;
}

/**
 * A run `stopRuns` killed. Keys are snake_case because this shape is returned
 * verbatim in the `stop_conversation` MCP response.
 */
export interface StoppedRun {
  /** cennad session UUID of the killed run. */
  session_id: string;
  /** Provider whose CLI was killed. */
  provider: Provider;
  /** How long the run had been going when it was killed. */
  elapsed_ms: number;
}

/**
 * Which runs a stop targets. An omitted field matches everything, so an empty
 * filter stops every run this process has in flight.
 */
export interface StopFilter {
  /** Stop only the run under this cennad session UUID. */
  sessionId?: string;
  /** Stop only runs of this provider. */
  provider?: Provider;
}
