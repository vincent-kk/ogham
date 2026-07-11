import type { PluginIR } from "../types/ir.js";
import type { HostProfile } from "../types/profile.js";
import { manifestMeta } from "./shared/manifestMeta.js";

/** Claude-runtime-only frontmatter keys that other hosts ignore. */
const DROP_KEYS = ["user_invocable", "argument-hint"];

/**
 * Antigravity (agy) host profile (grounded in the bundled official docs):
 *  - Root `plugin.json` is a marker (name only required); agy discovers skills/,
 *    mcp_config.json, hooks.json by directory convention, so the manifest carries
 *    metadata only — no skills/mcpServers pointers.
 *  - MCP config lives in `mcp_config.json` with the same `mcpServers` wrapper.
 *    The official Stdio schema is command/args/env (no cwd); relative args resolve
 *    from the plugin dir — confirmed by the Stage 1 smoke gate.
 *  - Tool names are `mcp_<server>_<tool>` (estimated; confirmed by smoke).
 *  - Skills/agents are accepted in Claude form; per-plugin namespacing means the
 *    logical server name needs no override.
 */
export const agyProfile: HostProfile = {
  id: "agy",

  manifestPath: "plugin.json",
  buildManifest(ir: PluginIR): Record<string, unknown> {
    return manifestMeta(ir);
  },

  mcpPath: "mcp_config.json",
  buildMcp(ir: PluginIR): Record<string, unknown> | null {
    if (!ir.mcp) return null;
    return {
      mcpServers: {
        [ir.mcp.server]: { command: "node", args: [ir.mcp.entry] },
      },
    };
  },

  toolRef(ir: PluginIR, logical: string): string {
    const server = ir.mcp?.server ?? "tools";
    return `mcp_${server}_${logical}`;
  },
  skillRef(_ir: PluginIR, name: string): string {
    return name;
  },
  // agy has no dedicated prose plugin-root variable; ${CLAUDE_PLUGIN_ROOT} is the
  // de-facto placeholder. Plugin-file references in prose (e.g. filid migrate.sh)
  // are a known host-portability caveat. MCP paths use relative args (buildMcp).
  pluginRoot: "${CLAUDE_PLUGIN_ROOT}",

  skillDir(name: string): string {
    return `skills/${name}`;
  },
  dropSkillFrontmatterKeys: DROP_KEYS,

  // Agents accepted in Claude `.md` form. Hooks rebuilt in named-group form with
  // event rewiring; root is "." since agy runs hooks with cwd = hooks.json dir.
  agents: { form: "md", dir: "agents", modelSlug: () => "" },
  hooks: { form: "agy-named-groups", root: "." },
};
