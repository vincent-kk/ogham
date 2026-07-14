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

export const CLAUDE_PLUGIN_ROOT_VARIABLE = "${CLAUDE_PLUGIN_ROOT}";

/** Host marker injected into generated MCP declarations; absent = claude. */
export const HOST_MARKER_ENV_NAME = "OGHAM_HOST";

export const CLAUDE_MANIFEST_PATH = ".claude-plugin/plugin.json";
export const CLAUDE_MARKETPLACE_PATH = ".claude-plugin/marketplace.json";
export const CLAUDE_MCP_PATH = ".mcp.json";
export const CLAUDE_HOOKS_PATH = "hooks/hooks.json";
export const SKILLS_DIRECTORY = "skills";

export const CODEX_MANIFEST_PATH = ".codex-plugin/plugin.json";
export const AGY_MCP_CONFIG_PATH = "mcp_config.json";
export const CODEX_MARKETPLACE_PATH = ".agents/plugins/marketplace.json";
export const AGY_DECLARED_PLUGINS_PATH = ".agents/plugins.json";
