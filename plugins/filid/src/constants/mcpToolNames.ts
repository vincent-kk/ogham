/** Canonical names registered by the Filid MCP server. */
export const McpToolName = {
  PROJECT_SETUP: 'project_setup',
  FRACTAL_INSPECT: 'fractal_inspect',
  RESTRUCTURE: 'restructure',
  REVIEW_STATE: 'review_state',
} as const;

/** One registered Filid MCP tool name. */
export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

/** Ordered values of the canonical Filid MCP tool-name record. */
export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
