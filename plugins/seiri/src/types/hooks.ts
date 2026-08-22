/** Fields shared by Claude Code and Codex hook inputs. */
export interface HookBaseInput {
  cwd: string;
  session_id: string;
  hook_event_name: string;
  transcript_path?: string;
  /** Codex turn identifier when the host supplies one. */
  turn_id?: string;
  /** Active model identifier when the host supplies one. */
  model?: string;
  /** Active permission posture when the host supplies one. */
  permission_mode?: string;
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
 * PostToolUse input. Claude delivers successful Bash output as an object;
 * Codex delivers both zero and non-zero Bash output as a string on this event.
 */
export interface PostToolUseInput extends HookBaseInput {
  hook_event_name: 'PostToolUse';
  tool_name: string;
  tool_input?: { command?: unknown; [key: string]: unknown };
  tool_response?: unknown;
  /** Present only on a subagent's calls; measured on 2026-08-22. */
  agent_id?: string;
}

/**
 * Claude-only PostToolUseFailure input. Its error can carry an exit header and
 * output; `is_interrupt` is absent from Codex rather than inferred there.
 */
export interface PostToolUseFailureInput extends HookBaseInput {
  hook_event_name: 'PostToolUseFailure';
  tool_name: string;
  tool_input?: { command?: unknown; [key: string]: unknown };
  error?: string;
  /** Whether Claude reports that the user interrupted the command. */
  is_interrupt?: boolean;
  /** Present only on a subagent's calls; measured on 2026-08-22. */
  agent_id?: string;
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
