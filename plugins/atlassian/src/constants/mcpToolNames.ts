export const McpToolName = {
  FETCH: "fetch",
  CONVERT: "convert",
  AUTH_CHECK: "auth_check",
  SETUP: "setup",
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
