import { EDIT_TOOLS } from '../../constants/editNotice.js';
import { EMPTY_RESULT } from '../../constants/plugin.js';
import { observeInvocation } from '../../core/sessionSignals/workflow/observeInvocation.js';
import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowEnabled } from '../shared/workflowHost/workflowEnabled.js';
import { workflowHash } from '../shared/workflowHost/workflowHash.js';
import { workflowIdentity } from '../shared/workflowHost/workflowIdentity.js';
import { workflowRequest } from '../shared/workflowHost/workflowRequest.js';

import { editNotice } from './utils/editNotice.js';

/**
 * Observe a paired invocation or a file edit without selecting skills or
 * affecting permissions. Entry requests, and a main actor's edit with no
 * active binding, seed an absent actor from the payload's native turn.
 * @param input Native PreToolUse payload for the tool about to run; a Codex
 *   `apply_patch` arrives already expanded into `Write`/`Edit` payloads.
 * @param adapter Host adapter fixed at build time; defaults to `WORKFLOW_ADAPTER`.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @returns A non-blocking result carrying the edit notice as
 *   `additionalContext` when an edit makes one due; otherwise `EMPTY_RESULT`.
 */
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
  else if ((EDIT_TOOLS as readonly string[]).includes(input.tool_name)) {
    const additionalContext = editNotice(input, identity, now);
    if (additionalContext)
      return {
        continue: true,
        hookSpecificOutput: {
          hookEventName: input.hook_event_name,
          additionalContext,
        },
      };
  }
  return EMPTY_RESULT;
}
