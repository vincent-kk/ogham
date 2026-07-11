import type { PluginIR } from "../types/ir.js";
import type { HostProfile } from "../types/profile.js";
import { manifestMeta } from "./shared/manifestMeta.js";

/** Claude-runtime-only frontmatter keys that other hosts ignore. */
const DROP_KEYS = ["user_invocable", "argument-hint"];

/**
 * Codex CLI host profile (empirically grounded — see host-capability-matrix §3–4):
 *  - MCP uses the same `mcpServers` wrapper, but `${CLAUDE_PLUGIN_ROOT}` is NOT
 *    expanded in args. Use `cwd: "."` (joined against the install root) plus
 *    relative args.
 *  - Model-facing tool names are `mcp__<server>.<tool>` with no plugin scope, so
 *    the server name is overridden to the plugin name — otherwise plugins that
 *    share the server name "tools" collide when installed together.
 *  - Plugin-bundled hooks are unavailable (declaring them hangs the session);
 *    buildHooks emits nothing.
 */
export const codexProfile: HostProfile = {
  id: "codex",

  manifestPath: ".codex-plugin/plugin.json",
  buildManifest(ir: PluginIR): Record<string, unknown> {
    const m = manifestMeta(ir);
    if (ir.skills.length) m.skills = "./skills/";
    if (ir.mcp) m.mcpServers = "./.mcp.json";
    if (ir.store) m.interface = ir.store;
    return m;
  },

  mcpPath: ".mcp.json",
  buildMcp(ir: PluginIR): Record<string, unknown> | null {
    if (!ir.mcp) return null;
    return {
      mcpServers: {
        [ir.name]: { command: "node", args: [ir.mcp.entry], cwd: "." },
      },
    };
  },

  toolRef(ir: PluginIR, logical: string): string {
    return `mcp__${ir.name}.${logical}`;
  },
  skillRef(_ir: PluginIR, name: string): string {
    return `$${name}`;
  },
  // Prose plugin-root references use the injected ${CLAUDE_PLUGIN_ROOT} alias
  // (available to Codex). The MCP path strategy is separate — see buildMcp (cwd).
  pluginRoot: "${CLAUDE_PLUGIN_ROOT}",

  skillDir(name: string): string {
    return `skills/${name}`;
  },
  dropSkillFrontmatterKeys: DROP_KEYS,

  // Agents install separately via setup (staged under .codex-agents/); model slug
  // omitted (empty) until Codex agent model slugs are confirmed. Hooks unavailable
  // on Codex — dropped, compensated via AGENTS.md / MCP-boot sweep.
  agents: { form: "toml", dir: ".codex-agents", modelSlug: () => "" },
  hooks: { form: "none", root: null },
};
