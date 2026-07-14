import { McpToolName } from '../../constants/mcpToolNames.js';
import type { McpToolName as McpToolNameValue } from '../../constants/mcpToolNames.js';

/**
 * Set of maencof MCP write-tool names — the PostToolUse allowlist.
 * SYNC: the PostToolUse orchestrator (postToolUse.ts) gates activityRecorder on
 * this set; it must track the MCP tools that mutate vault state.
 *
 * Excluded tools: read, kg_search, kg_navigate, kg_context, kg_status have no
 * write side effects. kg_build writes to .maencof/ (index rebuild) but is
 * excluded because it clears stale-nodes on completion — tracking it here would
 * be contradictory.
 */
export const MAENCOF_MCP_TOOLS = new Set<McpToolNameValue>([
  McpToolName.CREATE,
  McpToolName.UPDATE,
  McpToolName.DELETE,
  McpToolName.MOVE,
  McpToolName.CAPTURE_INSIGHT,
  McpToolName.BOUNDARY_CREATE,
  McpToolName.CLAUDEMD_MERGE,
  McpToolName.CLAUDEMD_REMOVE,
]);

/**
 * Claude Code hook inputs carry MCP tool names in full form
 * (`mcp__plugin_maencof_tools__create`), while this package's constants use the
 * bare registered names (`create`). The prefix gate keeps foreign servers'
 * tools out — including maencof-lens, whose plugin segment continues with
 * `-` and therefore does not match `maencof_`.
 */
const MAENCOF_MCP_FULL_FORM_PREFIX = /^mcp__(?:plugin_)?maencof_/;

export function normalizeMaencofToolName(toolName: string): string {
  if (!MAENCOF_MCP_FULL_FORM_PREFIX.test(toolName)) return toolName;
  const separatorIndex = toolName.lastIndexOf('__');
  return separatorIndex > 0 ? toolName.slice(separatorIndex + 2) : toolName;
}

export function isMaencofMcpToolName(toolName: string): boolean {
  return MAENCOF_MCP_TOOLS.has(
    normalizeMaencofToolName(toolName) as McpToolNameValue,
  );
}
