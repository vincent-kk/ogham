import type { ParsedClaudeProjectJson } from "./adapterTypes.js";
import type { McpServerRequest } from "../../types/mcp.js";
import { toClaudeProjectDefinition } from "../encoding/toClaudeProjectDefinition.js";

export function renderClaudeProjectJson(
  parsed: ParsedClaudeProjectJson,
  request: McpServerRequest,
): string {
  const servers = Object.assign(
    Object.create(null) as Record<string, unknown>,
    parsed.servers,
  );
  if (request.definition === null) delete servers[request.name];
  else servers[request.name] = toClaudeProjectDefinition(request.definition);

  return `${JSON.stringify({ ...parsed.root, mcpServers: servers }, null, 2)}\n`;
}
