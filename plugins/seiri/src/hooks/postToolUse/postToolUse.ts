import { EMPTY_RESULT, INJECTION_PREFIX } from '../../constants/plugin.js';
import { completeInvocation } from '../../core/sessionSignals/workflow/completeInvocation.js';
import { transitionWorkflow } from '../../core/sessionSignals/workflow/transitionWorkflow.js';
import type {
  HookOutput,
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowAccepted } from '../shared/workflowHost/workflowAccepted.js';
import { workflowEnabled } from '../shared/workflowHost/workflowEnabled.js';
import { workflowHash } from '../shared/workflowHost/workflowHash.js';
import { workflowIdentity } from '../shared/workflowHost/workflowIdentity.js';
import { workflowRequest } from '../shared/workflowHost/workflowRequest.js';

import { bashOutcome } from './utils/bashOutcome.js';

/**
 * Apply only a paired result belonging to the current actor, task and turn.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 */
export function processToolOutcome(
  input: PostToolUseInput | PostToolUseFailureInput,
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
  if (
    !request &&
    (input.tool_name !== 'Bash' ||
      typeof command !== 'string' ||
      !command.trim())
  )
    return EMPTY_RESULT;
  const hash = workflowHash(
    request ? JSON.stringify(request) : (command as string),
  );
  return (
    completeInvocation(identity, hash, now, (state, invocation) => {
      if (invocation.kind === 'workflow') {
        if (
          !request ||
          input.hook_event_name !== 'PostToolUse' ||
          !workflowAccepted(input.tool_response, request, adapter)
        )
          return EMPTY_RESULT;
        const outcome = transitionWorkflow(state, request);
        if (outcome === 'rejected') return EMPTY_RESULT;
        return {
          continue: true,
          hookSpecificOutput: {
            hookEventName: input.hook_event_name,
            additionalContext:
              outcome === 'mismatch'
                ? `${INJECTION_PREFIX} Workflow ${request.task}: ${request.action} not applied; another task is bound — use start for new work.`
                : `${INJECTION_PREFIX} Workflow ${request.task}: ${request.action} acknowledged (${request.intent ?? 'participation only'}).`,
          },
        };
      }
      return state.binding?.state === 'active'
        ? bashOutcome({ ...input, cwd: identity.root }, state.binding)
        : EMPTY_RESULT;
    }) ?? EMPTY_RESULT
  );
}
