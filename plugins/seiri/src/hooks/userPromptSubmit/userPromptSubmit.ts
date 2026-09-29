import { INTERVENTION } from '../../constants/intervention.js';
import { EMPTY_RESULT } from '../../constants/plugin.js';
import { observeBoundary } from '../../core/sessionSignals/workflow/observeBoundary.js';
import type { HookOutput, UserPromptSubmitInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { loadHookIntervention } from '../shared/loadHookIntervention.js';
import { renderEntryLine } from '../shared/progressLine/renderEntryLine.js';
import { renderProgressLine } from '../shared/progressLine/renderProgressLine.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowEnabled } from '../shared/workflowHost/workflowEnabled.js';
import { workflowIdentity } from '../shared/workflowHost/workflowIdentity.js';

/**
 * Advance an existing actor's turn anchor; suspend participation only when the dial is off/advisory.
 * An active binding gets a progress line at standard and strict alike;
 * with no active binding, each dial states its entry guidance.
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
  const level = loadHookIntervention(input.cwd)?.effective;
  if (level === INTERVENTION.STANDARD || level === INTERVENTION.STRICT)
    return wire(input.hook_event_name, renderEntryLine(level));
  return EMPTY_RESULT;
}

/** Shape one non-blocking line as this hook's `additionalContext`. */
function wire(hookEventName: string, additionalContext: string): HookOutput {
  return {
    continue: true,
    hookSpecificOutput: { hookEventName, additionalContext },
  };
}
