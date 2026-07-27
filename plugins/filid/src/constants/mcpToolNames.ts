export const McpToolName = {
  PROJECT_INIT: 'project_init',
  RULE_DOCS_SYNC: 'rule_docs_sync',
  OPEN_SETTINGS: 'open_settings',
  FRACTAL_SCAN: 'fractal_scan',
  CONTEXT_RESOLVE: 'context_resolve',
  RESTRUCTURE_PLAN: 'restructure_plan',
  STRUCTURE_VALIDATE: 'structure_validate',
  VERIFICATION_SCAN: 'verification_scan',
  REVIEW_STATE: 'review_state',
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
