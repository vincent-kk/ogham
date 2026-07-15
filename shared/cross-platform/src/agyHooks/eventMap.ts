import type { AgyHookEvent, ClaudeHookEvent } from "./types.js";

/**
 * Which agy lifecycle event carries each Claude hook event.
 *
 * agy has no SessionStart or UserPromptSubmit; both are context-injection points that
 * fire before the model runs, which is exactly PreInvocation. PreToolUse/PostToolUse
 * keep their names. SubagentStart has no agy analogue and is dropped at the emitter,
 * so it never reaches this table.
 */
const CLAUDE_TO_AGY_EVENT: Record<ClaudeHookEvent, AgyHookEvent> = {
  SessionStart: "PreInvocation",
  UserPromptSubmit: "PreInvocation",
  PreToolUse: "PreToolUse",
  PostToolUse: "PostToolUse",
};

export function agyEventFor(claudeEvent: ClaudeHookEvent): AgyHookEvent {
  return CLAUDE_TO_AGY_EVENT[claudeEvent];
}
