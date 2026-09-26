import { EMPTY_RESULT } from '../../constants/plugin.js';
import { observeBoundary } from '../../core/sessionSignals/workflow/observeBoundary.js';
import type { HookOutput, UserPromptSubmitInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowEnabled } from '../shared/workflowHost/workflowEnabled.js';
import { workflowIdentity } from '../shared/workflowHost/workflowIdentity.js';

/**
 * Silently suspend previous work at a trusted user boundary; never elect a skill.
 * @param input Native UserPromptSubmit payload for the new user turn.
 * @param adapter Host adapter selecting the Claude/Codex ABI, fixed at build time.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @returns A fixed non-blocking `HookOutput`, regardless of outcome.
 */
export function processUserPromptSubmit(
  input: UserPromptSubmitInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
  now: number = Date.now(),
): HookOutput {
  const identity = workflowIdentity(input, adapter);
  if (identity) observeBoundary(identity, workflowEnabled(input.cwd), now);
  return EMPTY_RESULT;
}
