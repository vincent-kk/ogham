export const McpToolName = {
  SEARCH: "search",
  CONTEXT: "context",
  NAVIGATE: "navigate",
  READ: "read",
  STATUS: "status",
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
