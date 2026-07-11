const LITERAL_MCP = /mcp__[a-zA-Z0-9_]+/g;

/**
 * Find literal `mcp__…` tool names in a definition body. Definitions must use
 * `{{tool:}}` tokens instead so they stay host-neutral; a hit is a lint error.
 */
export function findLiteralToolNames(text: string): string[] {
  return [...new Set(text.match(LITERAL_MCP) ?? [])];
}
