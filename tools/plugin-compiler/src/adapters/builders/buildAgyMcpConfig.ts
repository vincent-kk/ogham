import type { McpServerSource, PluginFacts } from "../../types/adapter.js";
import { buildPortableMcpServer } from "../utils/buildPortableMcpServer.js";

const AGY_HOST_MARKER = "agy";

/**
 * Antigravity `mcp_config.json` content — same `mcpServers` wrapper with
 * plugin-root-relative args. Server names stay as-is (agy namespaces per
 * plugin). Relative-args resolution is migration gate G4.
 */
export function buildAgyMcpConfig(
  facts: PluginFacts,
): Record<string, unknown> | null {
  if (!facts.mcpServers) return null;

  const servers: Record<string, McpServerSource> = {};
  for (const [serverName, source] of Object.entries(facts.mcpServers))
    servers[serverName] = buildPortableMcpServer(source, AGY_HOST_MARKER);
  return { mcpServers: servers };
}
