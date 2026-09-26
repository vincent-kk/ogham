import { EMPTY_RESULT } from '../../constants/plugin.js';
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
import { workflowAck } from './utils/workflowAck.js';

/**
 * Apply only a paired result belonging to the current actor, task and turn.
 * @param input Hook payload for a successful or failed tool invocation.
 * @param adapter Host adapter fixed at build time; defaults to `WORKFLOW_ADAPTER`.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @returns A fail-open hook result: the workflow acknowledgment or mismatch
 *   line, an injected gate verdict, or the empty result when nothing pairs.
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
        const previousTask = state.binding?.task;
        const outcome = transitionWorkflow(state, request);
        const additionalContext = workflowAck(
          outcome,
          request,
          state,
          previousTask,
        );
        if (!additionalContext) return EMPTY_RESULT;
        return {
          continue: true,
          hookSpecificOutput: {
            hookEventName: input.hook_event_name,
            additionalContext,
          },
        };
      }
      return state.binding?.state === 'active'
        ? bashOutcome({ ...input, cwd: identity.root }, state.binding)
        : EMPTY_RESULT;
    }) ?? EMPTY_RESULT
  );
}
