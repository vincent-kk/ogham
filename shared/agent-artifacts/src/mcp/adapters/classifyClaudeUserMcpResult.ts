import type { McpCliRunResult } from "../../types/mcp.js";

export function classifyClaudeUserMcpResult(
  result: McpCliRunResult,
  name: string,
): "existing" | "missing" | null {
  if (result.code !== 1 || result.timedOut || result.spawnError !== undefined)
    return null;

  const message = result.stderr.trim();
  if (message === `MCP server ${name} already exists in user config`)
    return "existing";
  if (message === `No MCP server named "${name}" in user scope`)
    return "missing";
  return null;
}
