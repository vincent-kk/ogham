/** Which main actors in the registered checkout can receive a directive set. */
export type DirectiveScope = 'session' | 'all';

/** Explicit management operations supported by runtime directives. */
export type DirectiveOperation =
  'bind' | 'on' | 'off' | 'status' | 'remove' | 'append';

/** Persisted connection between a directive set and its intended audience. */
export interface DirectiveBinding {
  /** Whether the connection targets one main actor or the whole checkout. */
  scope: DirectiveScope;
  /** Whether this connection currently participates in compact injection. */
  enabled: boolean;
  /** Hashed workflow actor for a session-scoped connection. */
  actor?: string;
  /** Real repository root of the checkout where the set was registered. */
  root: string;
  /** Connection time in epoch milliseconds. */
  boundAt: number;
  /** Most recent compact injection time in epoch milliseconds. */
  lastInjectedAt?: number;
}

/** Metadata for a validated directive set, without reading its contents. */
export interface DirectiveSetSummary {
  /** Path-safe set directory name. */
  set: string;
  /** Sorted relative paths to the set's regular files. */
  files: string[];
  /** Aggregate UTF-8 file size in bytes. */
  bytes: number;
}

/** Append-only record of a structured set that an operation can extend. */
export type DirectiveLog = 'notepad' | 'history';

/** One way a structured set departs from its contract. */
export interface DirectiveViolation {
  /** Path of the offending file, relative to the set. */
  file: string;
  /** Kind of departure: size over its limit, a file the entry document never names, a markdown file it names that is absent, or a log line that is not a JSON object. */
  problem: 'over_limit' | 'unlisted' | 'missing' | 'invalid_line';
  /** Measured size and limit, the location of the mention, or the offending line number. */
  detail: string;
}

/** Structural findings about one directive set. */
export interface DirectiveInspection {
  /** Whether the set has an entry document. */
  structured: boolean;
  /** Departures from the set contract; always empty for an unstructured set. */
  violations: DirectiveViolation[];
  /** Number of nonblank lines left in the notepad, a signal that a retrospective is pending. */
  notepadLines: number;
}

/** Response to an explicit directive operation. */
export type DirectivesResult = DirectiveSetSummary &
  (
    | ({
        status: 'dial_low';
        op: 'bind' | 'status';
        dial: 'off' | 'advisory';
        binding?: DirectiveBinding;
        warning?: string;
      } & DirectiveInspection)
    | ({
        status: 'accepted';
        op: 'bind';
        scope: DirectiveScope;
        estimatedMode: 'inline' | 'pointer';
        warning?: string;
      } & DirectiveInspection)
    | ({
        status: 'ok';
        op: 'status';
        binding?: DirectiveBinding;
      } & DirectiveInspection)
    | {
        status: 'ok';
        op: 'on' | 'off' | 'remove';
        binding?: DirectiveBinding;
      }
    | {
        status: 'ok';
        op: 'append';
        log: DirectiveLog;
        notepadLines: number;
      }
  );
