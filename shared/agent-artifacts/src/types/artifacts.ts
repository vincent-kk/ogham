export type ArtifactHost = "claude" | "codex";

export type ArtifactScope = "project" | "user";

export type ArtifactKind = "rules" | "instructions" | "mcp";

export type ArtifactAction =
  | "copy"
  | "update"
  | "remove"
  | "relocate"
  | "unchanged"
  | "drift"
  | "skip"
  | "conflict"
  | "unsupported";

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

export interface ArtifactApplyResult {
  readonly outcomes: readonly ArtifactOutcome[];
  readonly revisions: readonly ArtifactRevision[];
}
