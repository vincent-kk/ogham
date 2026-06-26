export const McpToolName = {
  PAPER_SEARCH: "paper_search",
  PAPER_SEARCH_START: "paper_search_start",
  PAPER_SEARCH_STATUS: "paper_search_status",
  PAPER_SEARCH_RESULTS: "paper_search_results",
  MESH_LOOKUP: "mesh_lookup",
  FETCH_FULLTEXT: "fetch_fulltext",
  AUTH_CHECK: "auth_check",
  SETUP: "setup",
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
