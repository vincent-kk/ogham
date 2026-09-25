import type { HookBaseInput } from './hooks.js';

/** Host-neutral identity, hashed at the hook boundary. */
export interface WorkflowIdentity {
  /** Resolved repository working directory. */
  root: string;
  /** Hash of host, native session and actor. */
  actor: string;
  /** Hash of the native turn, absent on some boundaries. */
  turn?: string;
  /** Hash of the native tool invocation. */
  call?: string;
}

/** Explicit participation request; the model cannot supply host identity. */
export interface WorkflowRequest {
  /** Requested transition, sequenced by the caller. */
  action: 'start' | 'resume' | 'pause' | 'finish';
  /** Required absolute workspace path. */
  project_root: string;
  /** Path-safe task name; no ledger is required. */
  task: string;
  /** Required for start and resume. */
  intent?: 'change' | 'review';
}

/** Bounded observations belonging to one task and actor. */
export interface WorkflowBinding {
  task: string;
  intent: 'change' | 'review';
  state: 'active' | 'suspended';
  counts: Record<string, number>;
  announced: string[];
  verdicts: Record<string, string>;
}

/** One pre-observed invocation; consumed at most once. */
export interface WorkflowInvocation {
  generation: number;
  turn: string;
  inputHash: string;
  startedAt: number;
  kind: 'workflow' | 'bash';
  request?: WorkflowRequest;
}

/** Atomic actor state. Native IDs and tool output are never persisted. */
export interface WorkflowState {
  version: 1;
  generation: number;
  turn?: string;
  lastObservedAt: number;
  binding?: WorkflowBinding;
  invocations: Record<string, WorkflowInvocation>;
  /** Invocations already seen in this turn, including completed generations. */
  seen: string[];
}

/** Statically selected by the hook build; tests can inject either concrete adapter. */
export interface WorkflowHostAdapter {
  /** Namespace fixed for the lifetime of this hook bundle. */
  name: 'claude' | 'codex';
  /** Fully qualified callable tool address emitted for this host. */
  workflowTool: string;
  /** Read this host's native turn identity, without inference. */
  turn(input: HookBaseInput): string | undefined;
  /** Read this host's successful MCP content envelope. */
  content(response: unknown): unknown;
}
