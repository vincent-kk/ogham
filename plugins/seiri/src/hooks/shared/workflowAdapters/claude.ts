import { HostTool } from '../../../constants/hooks.js';
import type { WorkflowHostAdapter } from '../../../types/workflow.js';

/** Canonical Claude hook ABI; Codex builds do not include this module. */
export const CLAUDE_WORKFLOW_ADAPTER: WorkflowHostAdapter = {
  name: 'claude',
  runtimeTool: HostTool.RUNTIME,
  turn: (input) => input.prompt_id,
  content: (response) => response,
};
