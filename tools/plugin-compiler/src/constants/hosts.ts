/** Hook events Codex accepts from a plugin hooks file. */
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
  "SessionEnd",
] as const;

export const CODEX_HOOK_EVENT_SET: ReadonlySet<string> = new Set(
  CODEX_HOOK_EVENTS,
);

/**
 * Matcher behavior measured from Codex's hook tool vocabulary.
 *
 * `Skill` has no Codex tool event, so an exact token cannot fire. `Read` also
 * has no native tool, but PreToolUse can conservatively observe simple reads
 * through Bash normalization; keep the source token and add that fallback.
 * Builders and lint consume this same declaration so adaptation and diagnosis
 * cannot drift.
 */
export const CODEX_HOOK_MATCHER_CAPABILITIES: {
  readonly toolMatcherEvents: readonly string[];
  readonly unsupportedExactTools: readonly string[];
  readonly preToolFallbacks: readonly {
    source: string;
    target: string;
  }[];
} = {
  toolMatcherEvents: ["PreToolUse", "PostToolUse"],
  unsupportedExactTools: ["Skill"],
  preToolFallbacks: [{ source: "Read", target: "Bash" }],
};

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
