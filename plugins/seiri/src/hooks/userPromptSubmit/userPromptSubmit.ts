import { INTERVENTION } from '../../constants/intervention.js';
import { EMPTY_RESULT } from '../../constants/plugin.js';
import { observeBoundary } from '../../core/sessionSignals/workflow/observeBoundary.js';
import type { HookOutput, UserPromptSubmitInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { loadHookIntervention } from '../shared/loadHookIntervention.js';
import { renderChainLine } from '../shared/progressLine/renderChainLine.js';
import { renderProgressLine } from '../shared/progressLine/renderProgressLine.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowEnabled } from '../shared/workflowHost/workflowEnabled.js';
import { workflowIdentity } from '../shared/workflowHost/workflowIdentity.js';

/**
 * Record the turn anchor; suspend prior participation only when the dial is off/advisory.
 * An active binding gets a progress line at standard and strict alike;
 * with no active binding, strict alone falls back to the chain line.
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
  const enabled = workflowEnabled(input.cwd);
  const binding = identity
    ? observeBoundary(identity, enabled, now, { suspend: !enabled })
    : undefined;

  if (!enabled) return EMPTY_RESULT;
  if (binding?.state === 'active')
    return wire(
      input.hook_event_name,
      renderProgressLine(binding.task, binding.intent, binding.step),
    );
  if (loadHookIntervention(input.cwd)?.effective === INTERVENTION.STRICT)
    return wire(input.hook_event_name, renderChainLine());
  return EMPTY_RESULT;
}

/** Shape one non-blocking line as this hook's `additionalContext`. */
function wire(hookEventName: string, additionalContext: string): HookOutput {
  return {
    continue: true,
    hookSpecificOutput: { hookEventName, additionalContext },
  };
}
