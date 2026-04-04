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
  agent_name: string;
  agent_prompt: string;
}

/** UserPromptSubmit hook input */
export interface UserPromptSubmitInput extends HookBaseInput {
  hook_event_name: 'UserPromptSubmit';
  user_prompt: string;
}

/** SessionEnd hook input */
export interface SessionEndInput extends HookBaseInput {
  hook_event_name: 'SessionEnd';
}

/** Hook output (stdout JSON) */
export interface HookOutput {
  /** Whether to continue (false = block, PreToolUse only) */
  continue: boolean;
  /** Hook-specific output */
  hookSpecificOutput?: {
    /** Hook event name (required by Claude Code for structured output) */
    hookEventName?: string;
    /** Additional context to inject into agent */
    additionalContext?: string;
  };
}
