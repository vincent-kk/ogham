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

/**
 * Codex spawns plugin MCP servers with the *session* cwd, not the plugin root
 * (measured on codex-cli 0.144.4) — a relative `args` path then resolves against
 * the user's project, the server dies at initialize, and only the TUI surfaces a
 * warning. Pinning cwd to the plugin root is the sole fix: the install path
 * (`~/.codex/plugins/cache/<marketplace>/<plugin>/<version>`) is unknowable when
 * the adapter is generated, so absolute args cannot be emitted instead.
 */
export const CODEX_MCP_CWD = ".";

/** Injected into generated MCP declarations; absence of the marker means claude. */
export const HOST_MARKER_ENV_NAME = "OGHAM_HOST";

export const HOST_MARKERS = {
  codex: "codex",
  agy: "agy",
} as const;

export type HostMarker = (typeof HOST_MARKERS)[keyof typeof HOST_MARKERS];
