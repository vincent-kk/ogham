export const McpToolName = {
  PING: 'ping',
  RUN_CREATE: 'run_create',
  RUN_GET: 'run_get',
  RUN_TRANSITION: 'run_transition',
  RUN_LIST: 'run_list',
  MANIFEST_GET: 'manifest_get',
  MANIFEST_SAVE: 'manifest_save',
  MANIFEST_VALIDATE: 'manifest_validate',
  MANIFEST_PLAN: 'manifest_plan',
  MANIFEST_IMPLEMENT_PLAN: 'manifest_implement_plan',
  CONFIG_GET: 'config_get',
  CONFIG_SET: 'config_set',
  OPEN_SETTINGS: 'open_settings',
  CACHE_GET: 'cache_get',
  CACHE_SET: 'cache_set',
  AST_SEARCH: 'ast_search',
  AST_ANALYZE: 'ast_analyze',
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
