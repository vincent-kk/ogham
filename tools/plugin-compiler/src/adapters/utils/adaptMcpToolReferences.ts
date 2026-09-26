import {
  MCP_TOOL_MARKER,
  MCP_TOOL_TOKEN,
} from "./mcpToolReferences/patterns.js";

/**
 * Rewrite a validated marked file without changing external references.
 * @param content Canonical content whose single owned marker was validated.
 * @param names Validated canonical-to-callable mapping for the whole plugin.
 * @returns Generated content with its opt-in marker removed.
 */
export function adaptMcpToolReferences(
  content: string,
  names: Record<string, string>,
): string {
  return content
    .replace(MCP_TOOL_MARKER, "")
    .replace(MCP_TOOL_TOKEN, (token) => names[token] ?? token);
}
