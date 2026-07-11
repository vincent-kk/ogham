import { substituteTokens } from "../../tokens/substituteTokens.js";
import type { PluginIR } from "../../types/ir.js";
import type { FileMap } from "../../types/output.js";
import type { HostProfile } from "../../types/profile.js";
import { buildAgentToml } from "./buildAgentToml.js";
import { resolverFor } from "./resolverFor.js";

/**
 * Emit subagents per the host strategy: `md` (Claude/agy — token-substituted
 * `.md`, byte-faithful for Claude), `toml` (Codex `.codex-agents/<name>.toml`),
 * or `none`.
 */
export function emitAgents(ir: PluginIR, profile: HostProfile): FileMap {
  const files: FileMap = new Map();
  const { form, dir } = profile.agents;
  if (form === "none" || !ir.agents.length) return files;

  const resolve = resolverFor(ir, profile);
  for (const agent of ir.agents)
    if (form === "md")
      files.set(
        `${dir}/${agent.name}.md`,
        Buffer.from(substituteTokens(agent.rawText, resolve), "utf8"),
      );
    else
      files.set(
        `${dir}/${agent.name}.toml`,
        Buffer.from(buildAgentToml(agent, ir, profile), "utf8"),
      );

  return files;
}
