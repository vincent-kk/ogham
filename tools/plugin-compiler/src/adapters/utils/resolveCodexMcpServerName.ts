import type { PluginFacts } from "../../types/index.js";

/**
 * Resolve the established Codex manifest key for a declared server.
 * @param facts Canonical plugin metadata and declared server collection.
 * @param serverName A key in the plugin's declared MCP servers.
 * @returns The plugin name for one server, otherwise a plugin-prefixed key.
 */
export function resolveCodexMcpServerName(
  facts: PluginFacts,
  serverName: string,
): string {
  return Object.keys(facts.mcpServers ?? {}).length === 1
    ? facts.name
    : `${facts.name}-${serverName}`;
}
