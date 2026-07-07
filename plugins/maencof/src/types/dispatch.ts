import type { LifecycleEvent } from './lifecycle.js';

/** The six Claude Code hook events maencof dispatches. */
export type DispatchEvent = LifecycleEvent;

/**
 * Superset of every concern handler's stdin input. All fields optional so a
 * single parsed object satisfies each handler's narrower input type.
 */
export interface DispatchInput {
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  prompt?: string;
  skills_used?: string[];
  files_modified?: string[];
}

/** Superset of every concern handler's return shape. */
export interface HookConcernResult {
  continue: boolean;
  reason?: string;
  message?: string;
  systemMessage?: string;
  suppressOutput?: boolean;
  hookSpecificOutput?: {
    hookEventName?: string;
    additionalContext?: string;
  };
}

/** Single merged envelope written to stdout (or stderr + exit for blocks). */
export interface MergedHookOutput {
  continue: boolean;
  reason?: string;
  message?: string;
  systemMessage?: string;
  hookSpecificOutput?: {
    hookEventName: DispatchEvent;
    additionalContext: string;
  };
}

/**
 * PreToolUse stdout contract (Claude Code hooks reference). A tool-call block
 * MUST use `permissionDecision: "deny"` + `permissionDecisionReason` (shown to
 * Claude); top-level `continue:false` aborts the whole turn and drops `reason`.
 */
export interface PreToolUseHookSpecificOutput {
  hookEventName: 'PreToolUse';
  permissionDecision?: 'allow' | 'deny' | 'ask';
  permissionDecisionReason?: string;
  additionalContext?: string;
}

/** Envelope the PreToolUse entry writes to stdout. */
export interface PreToolUseStdoutEnvelope {
  continue: boolean;
  systemMessage?: string;
  hookSpecificOutput?: PreToolUseHookSpecificOutput;
}
