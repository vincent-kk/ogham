import { EMPTY_RESULT } from '../../constants/plugin.js';
import { observeBoundary } from '../../core/sessionSignals/workflow/transitions.js';
import type { HookOutput, SessionStartInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowIdentity } from '../shared/workflowHost.js';

/** Invalidate existing participation at native session resets; compaction is continuous. */
export function processSessionStart(
  input: SessionStartInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
): HookOutput {
  if (!['startup', 'resume', 'clear', 'fork'].includes(input.source ?? ''))
    return EMPTY_RESULT;
  const identity = workflowIdentity(input, adapter);
  if (identity) observeBoundary(identity, false);
  return EMPTY_RESULT;
}
