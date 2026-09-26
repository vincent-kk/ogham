import { McpToolReferenceError } from "../mcpToolReferenceError.js";
import { MCP_TOOL_MARKER } from "./patterns.js";

/**
 * Determine whether a file explicitly selects owned MCP adaptation.
 * @param content Canonical skill or reference content to inspect.
 * @param relativePath Source-relative path used for failure diagnostics.
 * @param pluginName Owning plugin required in the sole marker.
 * @returns Whether a valid marker exists; unmarked content is not selected.
 * @throws McpToolReferenceError for malformed, duplicate or foreign markers.
 */
export function readMcpToolMarker(
  content: string,
  relativePath: string,
  pluginName: string,
): boolean {
  const candidates = content.match(/<!--\s*ogham-mcp-tools\b/g) ?? [];
  if (candidates.length === 0) return false;
  const matches = [...content.matchAll(MCP_TOOL_MARKER)];
  if (
    candidates.length !== 1 ||
    matches.length !== 1 ||
    matches[0][1] !== pluginName
  )
    throw new McpToolReferenceError(
      `MCP marker in ${relativePath} must occur once and name plugin ${pluginName}`,
    );
  return true;
}
