export const McpToolName = {
  RUN_CREATE: 'run_create',
  RUN_GET: 'run_get',
  RUN_TRANSITION: 'run_transition',
  RUN_LIST: 'run_list',
  MANIFEST_SAVE: 'manifest_save',
  MANIFEST_VALIDATE: 'manifest_validate',
  CONFIG_GET: 'config_get',
  CONFIG_SET: 'config_set',
  OPEN_SETTINGS: 'open_settings',
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
