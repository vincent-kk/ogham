import { HOST_MARKERS } from "../../constants/hosts.js";
import type { McpServerSource, PluginFacts } from "../../types/index.js";
import { buildPortableMcpServer } from "../utils/buildPortableMcpServer.js";

export function buildAgyMcpConfig(
  facts: PluginFacts,
): Record<string, unknown> | null {
  if (!facts.mcpServers) return null;

  const servers: Record<string, McpServerSource> = {};
  for (const [serverName, source] of Object.entries(facts.mcpServers))
    servers[serverName] = buildPortableMcpServer(source, HOST_MARKERS.agy);
  return { mcpServers: servers };
}
