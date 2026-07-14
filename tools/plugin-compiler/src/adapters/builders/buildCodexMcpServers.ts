import { HOST_MARKERS } from "../../constants/hosts.js";
import type { McpServerSource, PluginFacts } from "../../types/index.js";
import { buildPortableMcpServer } from "../utils/buildPortableMcpServer.js";

export function buildCodexMcpServers(
  facts: PluginFacts,
): Record<string, McpServerSource> | null {
  if (!facts.mcpServers) return null;

  const sourceEntries = Object.entries(facts.mcpServers);
  const servers: Record<string, McpServerSource> = {};
  for (const [serverName, source] of sourceEntries) {
    const codexName =
      sourceEntries.length === 1 ? facts.name : `${facts.name}-${serverName}`;
    servers[codexName] = buildPortableMcpServer(source, HOST_MARKERS.codex);
  }
  return servers;
}
