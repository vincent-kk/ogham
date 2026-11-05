export type ArtifactHost = "claude" | "codex";

export type ArtifactScope = "project" | "user";

export type ArtifactKind = "rules" | "instructions" | "mcp";

/** Planned or observed logical document action; partial retains incomplete effects. */
export type ArtifactAction =
  | "copy"
  | "update"
  | "remove"
  | "relocate"
  | "unchanged"
  | "drift"
  | "skip"
  | "conflict"
  | "unsupported"
  | "partial";

export interface ProjectArtifactManagerOptions {
  readonly host: ArtifactHost;
  readonly projectRoot: string;
  readonly owner: string;
}

export interface UserArtifactManagerOptions {
  readonly host: ArtifactHost;
  readonly owner: string;
}

export interface ArtifactOutcome {
  readonly id: string;
  readonly action: ArtifactAction;
  readonly target: string;
  readonly reason?: string;
}

export interface ArtifactRevision {
  readonly target: string;
  readonly revision: string | null;
}

export interface ArtifactPlan<TRequest> {
  readonly request: TRequest;
  readonly outcomes: readonly ArtifactOutcome[];
  readonly revisions: readonly ArtifactRevision[];
}

/** Serializable physical progress when a file plan stops at its first failure. */
export interface ArtifactPartialFailure {
  /** Targets whose changes finished before the failure, in execution order. */
  readonly applied: readonly string[];
  /** The attempted target and the operation's error message. */
  readonly failed: {
    /** Target whose change failed, including failures while preparing its backup. */
    readonly target: string;
    /** Serializable error text retained across tool and settings responses. */
    readonly error: string;
  };
  /** Later targets that the failed plan did not attempt. */
  readonly notAttempted: readonly string[];
  /** Backups actually written, including one written for the failed target. */
  readonly backupPaths: readonly string[];
}

/** Logical outcomes and physical recovery data returned by artifact managers. */
export interface ArtifactApplyResult {
  /** Physical progress for each interrupted file plan; absent when none failed. */
  readonly partialFailures?: readonly ArtifactPartialFailure[];
  /** Logical document effects, distinguishing incomplete changes from success. */
  readonly outcomes: readonly ArtifactOutcome[];
  /** Target revision observations, or null when a target cannot be read. */
  readonly revisions: readonly ArtifactRevision[];
}
