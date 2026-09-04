/**
 * MCP tool names. Two, and that is the budget: every registered tool's
 * schema is a standing context cost, paid whether or not it is ever
 * called. Code search and analysis stay out — the harness already has
 * them.
 */
export const ToolName = {
  GATES: 'gates',
  SETTINGS: 'settings',
} as const;

export type ToolNameValue = (typeof ToolName)[keyof typeof ToolName];
