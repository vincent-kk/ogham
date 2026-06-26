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

export function isMaencofMcpToolName(
  toolName: string,
): toolName is McpToolNameValue {
  return MAENCOF_MCP_TOOLS.has(toolName as McpToolNameValue);
}
