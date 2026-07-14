/** Hook events Codex parses from a Claude-format hooks.json (openai/codex hook_config.rs). */
export const CODEX_HOOK_EVENTS = [
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "SessionStart",
  "UserPromptSubmit",
  "SubagentStart",
  "SubagentStop",
  "Stop",
] as const;

export const CODEX_HOOK_EVENT_SET: ReadonlySet<string> = new Set(
  CODEX_HOOK_EVENTS,
);

/** Injected into generated MCP declarations; absence of the marker means claude. */
export const HOST_MARKER_ENV_NAME = "OGHAM_HOST";

export const HOST_MARKERS = {
  codex: "codex",
  agy: "agy",
} as const;

export type HostMarker = (typeof HOST_MARKERS)[keyof typeof HOST_MARKERS];
