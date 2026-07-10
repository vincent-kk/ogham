/**
 * Claude Code Hook input/output type definitions
 */

/** Hook base input (stdin JSON) */
export interface HookBaseInput {
  /** Current working directory */
  cwd: string;
  /** Session identifier */
  session_id: string;
  /** Hook event name */
  hook_event_name: string;
}

/** SessionStart hook input */
export interface SessionStartInput extends HookBaseInput {
  hook_event_name: 'SessionStart';
}

/** PreToolUse hook input */
export interface PreToolUseInput extends HookBaseInput {
  hook_event_name: 'PreToolUse';
  tool_name: string;
  tool_input: Record<string, unknown>;
}

/** SubagentStart hook input */
export interface SubagentStartInput extends HookBaseInput {
  hook_event_name: 'SubagentStart';
  /** Agent type (plugin-namespaced spawns arrive as "imbas:<name>") */
  agent_type: string;
  /** Agent ID */
  agent_id: string;
}

/** UserPromptSubmit hook input */
export interface UserPromptSubmitInput extends HookBaseInput {
  hook_event_name: 'UserPromptSubmit';
  /** User prompt content */
  prompt?: string;
}

/** SessionEnd hook input */
export interface SessionEndInput extends HookBaseInput {
  hook_event_name: 'SessionEnd';
}

/** Hook output (stdout JSON) */
export interface HookOutput {
  /**
   * Whether to continue Claude's turn. `false` STOPS the entire turn and
   * overrides any `permissionDecision` — it is not a per-tool block. Keep
   * `true` for per-tool denies; express the block via `permissionDecision`.
   */
  continue: boolean;
  /** Hook-specific output */
  hookSpecificOutput?: {
    /** Hook event name (required by Claude Code for structured output) */
    hookEventName?: string;
    /** Additional context to inject into agent */
    additionalContext?: string;
    /** PreToolUse per-tool gate: "deny" blocks only this call. */
    permissionDecision?: 'allow' | 'deny' | 'ask';
    /** Reason delivered to the model when permissionDecision is set. */
    permissionDecisionReason?: string;
  };
}
