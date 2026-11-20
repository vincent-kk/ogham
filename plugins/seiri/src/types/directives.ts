/** Which main actors in the registered checkout can receive a directive set. */
export type DirectiveScope = 'session' | 'all';

/** Explicit management operations supported by runtime directives. */
export type DirectiveOperation = 'bind' | 'on' | 'off' | 'status' | 'remove';

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
