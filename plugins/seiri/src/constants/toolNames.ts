/**
 * MCP tool names. Three, and that is the budget: every registered tool's
 * schema is a standing context cost, paid whether or not it is ever
 * called. Code search and analysis stay out — the harness already has
 * them.
 */
export const ToolName = {
  GATES: 'gates',
  SETTINGS: 'settings',
  WORKFLOW: 'workflow',
} as const;

export type ToolNameValue = (typeof ToolName)[keyof typeof ToolName];
