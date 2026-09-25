import type { WorkflowHostAdapter } from '../../../types/workflow.js';

/** Canonical Claude hook ABI; Codex builds do not include this module. */
export const CLAUDE_WORKFLOW_ADAPTER: WorkflowHostAdapter = {
  name: 'claude',
  workflowTool: 'mcp__plugin_seiri_tools__workflow',
  turn: (input) => input.prompt_id,
  content: (response) => response,
};
