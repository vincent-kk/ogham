export const McpToolName = {
  RENDER_VIEWER: "render_viewer",
  COLLECT_FEEDBACK: "collect_feedback",
  CLOSE_VIEWER: "close_viewer",
  OPEN_SETTINGS: "open_settings",
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
