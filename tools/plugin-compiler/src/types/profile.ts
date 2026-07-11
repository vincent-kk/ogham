/**
 * Host profile contract. One profile per target host encapsulates every
 * host-specific rule; emitters stay host-agnostic and call into the profile.
 * See `.metadata/plugin-compiler/compiler-architecture.md` §2.
 */
import type { PluginIR } from "./ir.js";
import type { HostId } from "./output.js";

export interface HostProfile {
  readonly id: HostId;

  // ── Manifest ──────────────────────────────────────────────────────────
  /** Manifest path relative to the target root (e.g. `.claude-plugin/plugin.json`). */
  readonly manifestPath: string;
  /**
   * Build the manifest object. Insertion order becomes emit key order, so the
   * Claude profile follows `ir.manifestKeyOrder` for byte-equivalence.
   */
  buildManifest(ir: PluginIR): Record<string, unknown>;

  // ── MCP ───────────────────────────────────────────────────────────────
  /** MCP config path relative to the target root, or null if the host takes none. */
  readonly mcpPath: string | null;
  /** Build the MCP config object, or null when the plugin has no MCP server. */
  buildMcp(ir: PluginIR): Record<string, unknown> | null;

  // ── Token resolution (skill body substitution) ────────────────────────
  /** Resolve a `{{tool:<logical>}}` reference to the host's model-facing name. */
  toolRef(ir: PluginIR, logical: string): string;
  /** Resolve a `{{skill:<name>}}` cross-reference. */
  skillRef(ir: PluginIR, name: string): string;
  /**
   * `{{pluginRoot}}` expansion for skill/agent *prose bodies* (distinct from the
   * MCP path strategy, which buildMcp owns). Null only if the host cannot express
   * a plugin-root reference in prose at all.
   */
  readonly pluginRoot: string | null;

  // ── Skills ────────────────────────────────────────────────────────────
  /** Directory (relative to target root) that holds a skill's files. */
  skillDir(name: string): string;
  /** Frontmatter keys stripped from emitted SKILL.md (line-level filter). */
  readonly dropSkillFrontmatterKeys: readonly string[];

  // ── Agents & hooks (data-driven; emit logic reads these) ──────────────
  readonly agents: AgentStrategy;
  readonly hooks: HookStrategy;
}

/** How a host materializes subagents. */
export interface AgentStrategy {
  /** `md` = Claude-form `.md`; `toml` = Codex `.codex-agents/<n>.toml`; `none` = drop. */
  readonly form: "md" | "toml" | "none";
  /** Directory (relative to target root) for agent files. */
  readonly dir: string;
  /** Map a logical model grade to the host's model slug (for `toml`). */
  modelSlug(grade: "standard" | "deep"): string;
}

/** How a host materializes lifecycle hooks. */
export interface HookStrategy {
  /** `claude-json` = `hooks/hooks.json`; `agy-named-groups` = root `hooks.json`; `none` = drop. */
  readonly form: "claude-json" | "agy-named-groups" | "none";
  /** The `{{pluginRoot}}` value substituted into hook commands, or null when hooks are dropped. */
  readonly root: string | null;
}
