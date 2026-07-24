/** Fields every Claude Code hook receives on stdin. */
export interface HookBaseInput {
  cwd: string;
  session_id: string;
  hook_event_name: string;
  transcript_path?: string;
}

/** SessionStart hook input. */
export interface SessionStartInput extends HookBaseInput {
  hook_event_name: 'SessionStart';
  /**
   * Start reason: `startup` | `resume` | `clear` | `compact` | `fork`.
   * Typed loosely on purpose — an unrecognised value must no-op, not throw.
   */
  source?: string;
}

/**
 * UserPromptSubmit input — fires once per user turn, before the model acts.
 * `prompt` is the submitted text; the reminder hook does not read it, but
 * the field is documented so a future use has the shape.
 */
export interface UserPromptSubmitInput extends HookBaseInput {
  hook_event_name: 'UserPromptSubmit';
  prompt?: string;
  [key: string]: unknown;
}

/**
 * PostToolUse input, delivered after a tool call that *succeeded*.
 *
 * `tool_response` for Bash carries `stdout` / `stderr` and no exit code,
 * because reaching this event already means the command exited zero. A
 * non-zero exit arrives as {@link PostToolUseFailureInput} instead.
 */
export interface PostToolUseInput extends HookBaseInput {
  hook_event_name: 'PostToolUse';
  tool_name: string;
  tool_input?: { command?: unknown; [key: string]: unknown };
  tool_response?: Record<string, unknown>;
}

/**
 * PostToolUseFailure input — a separate event from PostToolUse, with a
 * different payload: no `tool_response`, an `error` string carrying the
 * exit code and stderr, and `is_interrupt` when the user stopped the run
 * rather than the command failing on its own.
 */
export interface PostToolUseFailureInput extends HookBaseInput {
  hook_event_name: 'PostToolUseFailure';
  tool_name: string;
  tool_input?: { command?: unknown; [key: string]: unknown };
  error?: string;
  is_interrupt?: boolean;
}

/** SubagentStart input. `agent_type` is the matcher's field. */
export interface SubagentStartInput extends HookBaseInput {
  hook_event_name: 'SubagentStart';
  agent_type?: string;
  [key: string]: unknown;
}

/**
 * InstructionsLoaded hook input.
 *
 * The event fires when a CLAUDE.md or `.claude/rules/*.md` file is read
 * into context. Claude Code's public reference documents the common
 * fields and the load reasons but not the event-specific payload keys, so
 * the extra keys stay open and the observation record persists the raw
 * object — the first live run is what tells us the real shape.
 */
export interface InstructionsLoadedInput extends HookBaseInput {
  hook_event_name: 'InstructionsLoaded';
  /**
   * Why the file loaded: `session_start` | `nested_traversal` |
   * `path_glob_match` | `include` | `compact`. Delivered in the payload
   * rather than through a matcher — this event has no matcher support.
   */
  reason?: string;
  [key: string]: unknown;
}

/** Hook output (stdout JSON). */
export interface HookOutput {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName?: string;
    additionalContext?: string;
  };
}
