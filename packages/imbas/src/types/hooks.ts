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
