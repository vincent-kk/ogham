import type { WorkflowSkill } from '../constants/workflowChain.js';

import type { HookBaseInput } from './hooks.js';

/** Requested lifecycle transition, sequenced by the caller. */
export type WorkflowAction = 'step' | 'start' | 'resume' | 'pause' | 'finish';

/** Declared purpose of a start or resume request. */
export type WorkflowIntent = 'change' | 'review';

/** Chain skill a `step` request names; the union of the nine chain skills. */
export type WorkflowStep = WorkflowSkill;

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
  action: WorkflowAction;
  /** Required absolute workspace path. */
  project_root: string;
  /** Path-safe task name; no ledger is required. */
  task: string;
  /** Chain skill named by a `step` request; required for `action: "step"`. */
  step?: WorkflowStep;
  /** Required for start and resume; derived for `step` when absent. */
  intent?: WorkflowIntent;
}

/** Result of one runtime participation call; only `accepted` carries the request back. */
export type WorkflowReply =
  | { status: 'disabled'; reason: 'off' | 'advisory' }
  | {
      status: 'accepted';
      action: WorkflowAction;
      task: string;
      /** Echoed for `action: "step"`. */
      step?: WorkflowStep;
      intent?: WorkflowIntent;
    };

/** Bounded observations belonging to one task and actor. */
export interface WorkflowBinding {
  task: string;
  intent: WorkflowIntent;
  state: 'active' | 'suspended';
  /** Chain skill last recorded for this binding, when a `step` set it. */
  step?: WorkflowStep;
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
  runtimeTool: string;
  /** Read this host's native turn identity, without inference. */
  turn(input: HookBaseInput): string | undefined;
  /** Read this host's successful MCP content envelope. */
  content(response: unknown): unknown;
}
