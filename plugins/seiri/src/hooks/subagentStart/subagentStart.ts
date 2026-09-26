import { EMPTY_RESULT } from '../../constants/plugin.js';
import { observeBoundary } from '../../core/sessionSignals/workflow/observeBoundary.js';
import type { HookOutput, SubagentStartInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowEnabled } from '../shared/workflowHost/workflowEnabled.js';
import { workflowIdentity } from '../shared/workflowHost/workflowIdentity.js';

/**
 * Anchor a child's first native turn without inheriting the parent's workflow.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 */
export function processSubagentStart(
  input: SubagentStartInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
  now: number = Date.now(),
): HookOutput {
  const identity = workflowIdentity(input, adapter);
  if (identity && input.agent_id)
    observeBoundary(identity, workflowEnabled(input.cwd), now, true);
  return EMPTY_RESULT;
}
