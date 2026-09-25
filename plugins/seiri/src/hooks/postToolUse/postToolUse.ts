import { EMPTY_RESULT, INJECTION_PREFIX } from '../../constants/plugin.js';
import {
  completeInvocation,
  transitionWorkflow,
} from '../../core/sessionSignals/workflow/transitions.js';
import type {
  HookOutput,
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import {
  workflowAccepted,
  workflowEnabled,
  workflowHash,
  workflowIdentity,
  workflowRequest,
} from '../shared/workflowHost.js';

import { bashOutcome } from './utils/bashOutcome.js';

/** Apply only a paired result belonging to the current actor, task and turn. */
export function processToolOutcome(
  input: PostToolUseInput | PostToolUseFailureInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
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
    completeInvocation(identity, hash, (state, invocation) => {
      if (invocation.kind === 'workflow') {
        if (
          !request ||
          input.hook_event_name !== 'PostToolUse' ||
          !workflowAccepted(input.tool_response, request, adapter) ||
          !transitionWorkflow(state, request)
        )
          return EMPTY_RESULT;
        return {
          continue: true,
          hookSpecificOutput: {
            hookEventName: input.hook_event_name,
            additionalContext: `${INJECTION_PREFIX} Workflow ${request.task}: ${request.action} acknowledged (${request.intent ?? 'participation only'}).`,
          },
        };
      }
      return state.binding?.state === 'active'
        ? bashOutcome({ ...input, cwd: identity.root }, state.binding)
        : EMPTY_RESULT;
    }) ?? EMPTY_RESULT
  );
}
