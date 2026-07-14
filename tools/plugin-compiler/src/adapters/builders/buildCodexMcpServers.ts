import type { McpServerSource, PluginFacts } from "../../types/adapter.js";
import { buildPortableMcpServer } from "../utils/buildPortableMcpServer.js";

const CODEX_HOST_MARKER = "codex";

/**
 * Codex inline `mcpServers` for `.codex-plugin/plugin.json`. Server names are
 * overridden to the plugin name — ogham plugins share generic names (`tools`,
 * `t`) that would collide in Codex's un-scoped tool namespace. A lone server
 * takes the plugin name; siblings get a `<plugin>-<server>` suffix.
 */
export function buildCodexMcpServers(
  facts: PluginFacts,
): Record<string, McpServerSource> | null {
  if (!facts.mcpServers) return null;

  const sourceEntries = Object.entries(facts.mcpServers);
  const servers: Record<string, McpServerSource> = {};
  for (const [serverName, source] of sourceEntries) {
    const codexName =
      sourceEntries.length === 1 ? facts.name : `${facts.name}-${serverName}`;
    servers[codexName] = buildPortableMcpServer(source, CODEX_HOST_MARKER);
  }
  return servers;
}
