import { EMPTY_RESULT } from '../../constants/plugin.js';
import { observeBoundary } from '../../core/sessionSignals/workflow/transitions.js';
import type { HookOutput, UserPromptSubmitInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowEnabled, workflowIdentity } from '../shared/workflowHost.js';

/** Silently suspend previous work at a trusted user boundary; never elect a skill. */
export function processUserPromptSubmit(
  input: UserPromptSubmitInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
): HookOutput {
  const identity = workflowIdentity(input, adapter);
  if (identity) observeBoundary(identity, workflowEnabled(input.cwd));
  return EMPTY_RESULT;
}
