import { CODEX_MCP_CWD, HOST_MARKERS } from "../../constants/hosts.js";
import type { McpServerSource, PluginFacts } from "../../types/index.js";
import { buildPortableMcpServer } from "../utils/buildPortableMcpServer.js";

/** Codex-only shape — agy's MCP schema has no `cwd`, so it stays off the shared source type. */
export interface CodexMcpServer extends McpServerSource {
  cwd: string;
}

export function buildCodexMcpServers(
  facts: PluginFacts,
): Record<string, CodexMcpServer> | null {
  if (!facts.mcpServers) return null;

  const sourceEntries = Object.entries(facts.mcpServers);
  const servers: Record<string, CodexMcpServer> = {};
  for (const [serverName, source] of sourceEntries) {
    const codexName =
      sourceEntries.length === 1 ? facts.name : `${facts.name}-${serverName}`;
    const portable = buildPortableMcpServer(source, HOST_MARKERS.codex);
    servers[codexName] = {
      command: portable.command,
      args: portable.args,
      cwd: CODEX_MCP_CWD,
      env: portable.env,
    };
  }
  return servers;
}
