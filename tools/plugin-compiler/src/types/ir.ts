/**
 * Host-neutral Intermediate Representation (IR) of a plugin.
 *
 * Parsed from `plugins/<pkg>/definitions/`. The IR names no host — host
 * knowledge lives only in profiles. See `.metadata/plugin-compiler/ir-schema.md`.
 */

/** Lifecycle events named in the host-neutral (Claude) vocabulary. */
export type LogicalEvent =
  | "SessionStart"
  | "SessionEnd"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "Stop"
  | "SubagentStart";

/**
 * How a hook is rewired when the target host lacks its event or hook channel.
 * - `pre-invocation-once`: agy `PreInvocation` + runner once-guard (SessionStart).
 * - `stale-sweep`: cleanup deferred to the next-session MCP-boot sweep; Claude keeps
 *   its native hook, agy/codex drop it.
 * - `stop`: agy `Stop` (opt-in, genuinely lightweight per-turn-end work only).
 * - `mcp-lifecycle`: the logic lives in the MCP server's shutdown handler — emit NO
 *   hook on ANY host (Claude included). The target home for SessionEnd once a plugin
 *   moves it into the server. No capability-loss warning (it is handled, not lost).
 * - `drop`: omit everywhere with a loss warning.
 */
export type HookFallback =
  | "pre-invocation-once"
  | "stale-sweep"
  | "stop"
  | "mcp-lifecycle"
  | "drop";

/** A file copied verbatim into every target (skill supporting files, runtime bundles). */
export interface ExtraFile {
  /** Path relative to its logical root, POSIX separators. */
  relPath: string;
  bytes: Buffer;
}

/** MCP server declaration. The logical server name drives tool-reference assembly. */
export interface McpIR {
  /** Logical server name (e.g. `tools`, `t`). Codex overrides this with the plugin name. */
  server: string;
  /** Entry script relative to the plugin root (e.g. `bridge/mcp-server.cjs`). */
  entry: string;
  transport?: "stdio";
}

/**
 * A skill. Format-preserving: `rawText` is the original SKILL.md with tool/skill
 * references replaced by tokens. Emitters substitute tokens and filter frontmatter
 * lines on the raw text — never parse-and-reserialize (would drift bytes).
 */
export interface SkillIR {
  name: string;
  /** Full SKILL.md text; body carries `{{tool:}}`/`{{skill:}}` tokens. */
  rawText: string;
  /** Parsed frontmatter, for host key-filtering decisions only. */
  frontmatterKeys: Record<string, unknown>;
  /** Supporting files under the skill directory (e.g. references/*.md). */
  supportingFiles: ExtraFile[];
}

/**
 * A subagent persona. Format-preserving: `rawText` is the whole agent `.md`
 * (body tokenized) so Claude/agy emit byte-identically. Codex reads the fields
 * it needs (description/model/capability) tolerantly from the raw frontmatter —
 * never yaml-parsed, since tokenized `tools:` grants (`{{tool:x}}`) are not valid
 * YAML flow scalars.
 */
export interface AgentIR {
  name: string;
  rawText: string;
}

/**
 * One lifecycle hook handler. `command` is tokenized with `{{pluginRoot}}` so each
 * host substitutes its own root form. `fallback` steers rewiring on hosts that
 * lack the event (agy); Codex drops all hooks regardless.
 */
export interface HookIR {
  event: LogicalEvent;
  matcher: string;
  command: string;
  timeout?: number;
  fallback?: HookFallback;
}

/** The whole plugin, host-neutral. */
export interface PluginIR {
  name: string;
  version: string;
  description: string;
  keywords?: string[];
  author?: { name: string; email?: string };
  license?: string;
  repository?: string;
  homepage?: string;
  /** Host store metadata (e.g. Codex `interface`). Opaque, passed to profiles. */
  store?: Record<string, unknown>;
  mcp?: McpIR;
  skills: SkillIR[];
  agents: AgentIR[];
  hooks: HookIR[];
  /** Raw tokenized `definitions/hooks.json` text — Claude emits it by substitution
   *  (structure-preserving); agy rebuilds from `hooks`. Absent when no hooks. */
  hooksRaw?: string;
  /** Runtime bundles (bridge/, libs/) copied into every target verbatim. */
  runtimeFiles: ExtraFile[];
}
