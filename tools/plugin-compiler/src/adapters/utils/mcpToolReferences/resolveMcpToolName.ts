import type { McpServerPrefix } from "./createMcpServerPrefixes.js";
import { McpToolReferenceError } from "../mcpToolReferenceError.js";
import { MCP_SOURCE_NAME } from "./patterns.js";

/**
 * Resolve one owned canonical address to its normalized callable name.
 * @param token Complete owned MCP address from selected content or exact hooks.
 * @param prefixes Unambiguous declared-server mappings for the plugin.
 * @returns The Codex callable address using the selected server mapping.
 * @throws McpToolReferenceError for unknown/ambiguous servers or unsupported tools.
 */
export function resolveMcpToolName(
  token: string,
  prefixes: McpServerPrefix[],
): string {
  const matching = prefixes.filter((prefix) => token.startsWith(prefix.source));
  if (matching.length !== 1)
    throw new McpToolReferenceError(
      `MCP reference has an unknown or ambiguous server: ${token}`,
    );
  const prefix = matching[0];
  const toolName = token.slice(prefix.source.length);
  if (!MCP_SOURCE_NAME.test(toolName))
    throw new McpToolReferenceError(`Unsupported MCP tool name: ${token}`);
  return `${prefix.target}${toolName.replace(/[^A-Za-z0-9_]/g, "_")}`;
}
