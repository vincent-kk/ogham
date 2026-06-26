export const McpToolName = {
  CREATE: 'create',
  CAPTURE_INSIGHT: 'capture_insight',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MOVE: 'move',
  KG_SEARCH: 'kg_search',
  KG_NAVIGATE: 'kg_navigate',
  KG_CONTEXT: 'kg_context',
  KG_STATUS: 'kg_status',
  KG_BUILD: 'kg_build',
  BOUNDARY_CREATE: 'boundary_create',
  KG_SUGGEST_LINKS: 'kg_suggest_links',
  CLAUDEMD_MERGE: 'claudemd_merge',
  CLAUDEMD_READ: 'claudemd_read',
  CLAUDEMD_REMOVE: 'claudemd_remove',
  ACTIVITY_READ: 'activity_read',
  CONTEXT_CACHE_MANAGE: 'context_cache_manage',
  WORK_HISTORY: 'work_history',
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
