export const McpToolName = {
  START_CONVERSATION: 'start_conversation',
  CONTINUE_CONVERSATION: 'continue_conversation',
  OPEN_SETTINGS: 'open_settings',
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
