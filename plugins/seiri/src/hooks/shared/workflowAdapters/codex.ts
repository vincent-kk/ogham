import type { WorkflowHostAdapter } from '../../../types/workflow.js';

/** Codex hook ABI selected by the build, never discovered at runtime. */
export const CODEX_WORKFLOW_ADAPTER: WorkflowHostAdapter = {
  name: 'codex',
  workflowTool: 'mcp__seiri__workflow',
  turn: (input) => input.turn_id,
  content: (response) =>
    response && typeof response === 'object' && 'content' in response
      ? response.content
      : undefined,
};
