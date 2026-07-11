import type { PluginIR } from "../types/ir.js";
import type { HostProfile } from "../types/profile.js";
import { manifestMeta } from "./shared/manifestMeta.js";

/**
 * Claude Code host profile. Reproduces the current hand-maintained layout:
 * `.claude-plugin/plugin.json`, `.mcp.json` (mcpServers wrapper with the
 * `${CLAUDE_PLUGIN_ROOT}` args form), full-form tool names, `/plugin:skill`
 * cross-references. This profile is the byte-equivalence oracle's counterpart.
 */
export const claudeProfile: HostProfile = {
  id: "claude",

  manifestPath: ".claude-plugin/plugin.json",
  buildManifest(ir: PluginIR): Record<string, unknown> {
    const m = manifestMeta(ir);
    if (ir.skills.length) m.skills = "./skills/";
    if (ir.mcp) m.mcpServers = "./.mcp.json";
    return m;
  },

  mcpPath: ".mcp.json",
  buildMcp(ir: PluginIR): Record<string, unknown> | null {
    if (!ir.mcp) return null;
    const server: Record<string, unknown> = {
      command: "node",
      args: [`\${CLAUDE_PLUGIN_ROOT}/${ir.mcp.entry}`],
    };
    if (ir.mcp.transport) server.type = ir.mcp.transport;
    return { mcpServers: { [ir.mcp.server]: server } };
  },

  toolRef(ir: PluginIR, logical: string): string {
    const server = ir.mcp?.server ?? "tools";
    return `mcp__plugin_${ir.name}_${server}__${logical}`;
  },
  skillRef(ir: PluginIR, name: string): string {
    return `/${ir.name}:${name}`;
  },
  pluginRoot: "${CLAUDE_PLUGIN_ROOT}",

  skillDir(name: string): string {
    return `skills/${name}`;
  },
  dropSkillFrontmatterKeys: [],

  agents: { form: "md", dir: "agents", modelSlug: () => "" },
  hooks: { form: "claude-json", root: "${CLAUDE_PLUGIN_ROOT}" },
};
