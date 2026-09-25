import { EMPTY_RESULT } from '../../constants/plugin.js';
import { observeBoundary } from '../../core/sessionSignals/workflow/transitions.js';
import type { HookOutput, SubagentStartInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowEnabled, workflowIdentity } from '../shared/workflowHost.js';

/** Anchor a child's first native turn without inheriting the parent's workflow. */
export function processSubagentStart(
  input: SubagentStartInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
): HookOutput {
  const identity = workflowIdentity(input, adapter);
  if (identity && input.agent_id)
    observeBoundary(identity, workflowEnabled(input.cwd), true);
  return EMPTY_RESULT;
}
