export const McpToolName = {
  AST_ANALYZE: 'ast_analyze',
  FRACTAL_NAVIGATE: 'fractal_navigate',
  DOC_COMPRESS: 'doc_compress',
  TEST_METRICS: 'test_metrics',
  PROJECT_INIT: 'project_init',
  RULE_DOCS_SYNC: 'rule_docs_sync',
  FRACTAL_SCAN: 'fractal_scan',
  DRIFT_DETECT: 'drift_detect',
  LCA_RESOLVE: 'lca_resolve',
  RULE_QUERY: 'rule_query',
  STRUCTURE_VALIDATE: 'structure_validate',
  REVIEW_MANAGE: 'review_manage',
  DEBT_MANAGE: 'debt_manage',
  CACHE_MANAGE: 'cache_manage',
  AST_GREP_SEARCH: 'ast_grep_search',
  AST_GREP_REPLACE: 'ast_grep_replace',
  CONFIG_PATCH_VALIDATE: 'config_patch_validate',
  COVERAGE_VERIFY: 'coverage_verify',
  OPEN_SETTINGS: 'open_settings',
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
