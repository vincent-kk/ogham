import { EMPTY_RESULT } from '../../constants/plugin.js';
import { observeInvocation } from '../../core/sessionSignals/workflow/observeInvocation.js';
import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowEnabled } from '../shared/workflowHost/workflowEnabled.js';
import { workflowHash } from '../shared/workflowHost/workflowHash.js';
import { workflowIdentity } from '../shared/workflowHost/workflowIdentity.js';
import { workflowRequest } from '../shared/workflowHost/workflowRequest.js';

/** Observe a paired invocation without selecting skills or affecting permissions. */
export function processToolStart(
  input: PreToolUseInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
  now: number = Date.now(),
): HookOutput {
  const identity = workflowIdentity(input, adapter);
  if (!identity || !workflowEnabled(input.cwd)) return EMPTY_RESULT;
  const request = workflowRequest(
    input.tool_name,
    input.tool_input,
    input.cwd,
    adapter,
  );
  const command = input.tool_input?.command;
  if (request)
    observeInvocation(
      identity,
      workflowHash(JSON.stringify(request)),
      now,
      request,
    );
  else if (
    input.tool_name === 'Bash' &&
    typeof command === 'string' &&
    command.trim()
  )
    observeInvocation(identity, workflowHash(command), now);
  return EMPTY_RESULT;
}
