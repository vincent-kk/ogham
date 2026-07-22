/**
 * MCP tool names. Two, and that is the budget: every registered tool's
 * schema is a standing context cost, paid whether or not it is ever
 * called. Code search and analysis stay out — the harness already has
 * them.
 */
export const ToolName = {
  OPEN_SETTINGS: 'open_settings',
  RULE_DOCS_SYNC: 'rule_docs_sync',
} as const;

export type ToolNameValue = (typeof ToolName)[keyof typeof ToolName];
