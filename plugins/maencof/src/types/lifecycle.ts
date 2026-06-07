/**
 * @file lifecycle.ts
 * @description Lifecycle dispatcher types — dynamic hook actions managed via conversation
 */

/** Supported lifecycle hook events */
export type LifecycleEvent =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Stop'
  | 'SessionEnd';

/** v1 action types (echo, remind only; command reserved for v2) */
export type LifecycleActionType = 'echo' | 'remind';

/** Configuration for echo action — outputs a message to stdout */
export interface EchoConfig {
  message: string;
}

/** Configuration for remind action — conditional reminder */
export interface RemindConfig {
  message: string;
  /** Optional condition expression (reserved for v2 evaluation) */
  condition?: string;
}

/** Union of action configs by type */
export type LifecycleActionConfig = EchoConfig | RemindConfig;

/** A single lifecycle action registered by the user */
export interface LifecycleAction {
  /** Unique identifier for this action */
  id: string;
  /** Hook event this action responds to */
  event: LifecycleEvent;
  /** Whether this action is currently active */
  enabled: boolean;
  /** Action type */
  type: LifecycleActionType;
  /** Type-specific configuration */
  config: LifecycleActionConfig;
  /** Optional matcher pattern for PreToolUse/PostToolUse (e.g., "Write|Edit") */
  matcher?: string;
  /** Who created this action */
  created_by: 'user' | 'system';
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** Human-readable description */
  description: string;
}

/** Root lifecycle.json schema */
export interface LifecycleConfig {
  /** Schema version */
  version: 1;
  /** Registered actions */
  actions: LifecycleAction[];
}

/**
 * Claude Code hook JSON envelope used by the dispatcher.
 *
 * Per Claude Code's hook output spec:
 * - `SessionStart` / `UserPromptSubmit` / `PreToolUse` / `PostToolUse` support
 *   `hookSpecificOutput.additionalContext` (Claude-visible context).
 * - `Stop` / `SessionEnd` do NOT support `additionalContext`; only `systemMessage`
 *   (user-visible warning) is honored alongside `continue` / `suppressOutput`.
 * - Top-level `message` and `hookMessage` are NOT supported for any event and
 *   are silently dropped if emitted.
 */
export interface LifecycleHookSpecificOutput {
  hookEventName: LifecycleEvent;
  additionalContext: string;
}

/** Result of executing lifecycle actions for a given event */
export interface LifecycleDispatchResult {
  /** Whether Claude Code should continue processing */
  continue: boolean;
  /**
   * Event-scoped payload. Populated only for events that support
   * `additionalContext` (SessionStart / UserPromptSubmit / PreToolUse / PostToolUse).
   */
  hookSpecificOutput?: LifecycleHookSpecificOutput;
  /**
   * User-visible warning. Used for Stop / SessionEnd (which do not support
   * `additionalContext`) and as a fallback channel for any event where a
   * human-visible banner is desirable. Claude itself does not see this field.
   */
  systemMessage?: string;
}
