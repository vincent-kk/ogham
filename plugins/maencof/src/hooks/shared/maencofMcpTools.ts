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
export const MAENCOF_MCP_TOOLS = new Set([
  'create',
  'update',
  'delete',
  'move',
  'capture_insight',
  'boundary_create',
  'claudemd_merge',
  'claudemd_remove',
]);
