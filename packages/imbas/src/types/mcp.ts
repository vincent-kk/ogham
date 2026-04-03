/**
 * @file types/mcp.ts
 * @description MCP tool input/output type definitions
 */

/** Generic MCP tool input */
export interface McpToolInput {
  [key: string]: unknown;
}

/** MCP tool result */
export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
