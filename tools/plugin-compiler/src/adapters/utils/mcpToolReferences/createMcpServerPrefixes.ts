import type { PluginFacts } from "../../../types/index.js";
import { resolveCodexMcpServerName } from "../resolveCodexMcpServerName.js";
import { McpToolReferenceError } from "../mcpToolReferenceError.js";
import { MCP_SOURCE_NAME } from "./patterns.js";

/** Match an owned Claude server prefix to the host's normalized callable prefix. */
export interface McpServerPrefix {
  /** Canonical plugin-scoped server prefix including the tool separator. */
  source: string;
  /** Codex callable prefix; the underlying manifest key is preserved. */
  target: string;
}

/**
 * Create unambiguous prefixes from the manifest's server naming contract.
 * @param facts Canonical facts whose MCP server keys use supported characters.
 * @returns Canonical and callable prefixes in declared server order.
 * @throws McpToolReferenceError for unsupported or normalized-colliding keys.
 */
export function createMcpServerPrefixes(facts: PluginFacts): McpServerPrefix[] {
  const prefixes: McpServerPrefix[] = [];
  for (const serverName of Object.keys(facts.mcpServers ?? {})) {
    if (!MCP_SOURCE_NAME.test(serverName))
      throw new McpToolReferenceError(
        `Unsupported MCP server name: ${serverName}`,
      );
    const name = resolveCodexMcpServerName(facts, serverName).replace(
      /[^A-Za-z0-9_]/g,
      "_",
    );
    const target = `mcp__${name}__`;
    if (prefixes.some((prefix) => prefix.target === target))
      throw new McpToolReferenceError(`MCP server names collide at ${target}`);
    prefixes.push({
      source: `mcp__plugin_${facts.name}_${serverName}__`,
      target,
    });
  }
  return prefixes;
}
