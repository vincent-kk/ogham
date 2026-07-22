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
