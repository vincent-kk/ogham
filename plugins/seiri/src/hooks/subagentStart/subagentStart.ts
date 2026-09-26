import { EMPTY_RESULT } from '../../constants/plugin.js';
import { isFirstChildTurn } from '../../core/sessionSignals/workflow/isFirstChildTurn.js';
import { observeBoundary } from '../../core/sessionSignals/workflow/observeBoundary.js';
import { readActorBinding } from '../../core/sessionSignals/workflow/readActorBinding.js';
import type { HookOutput, SubagentStartInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { renderSubagentLine } from '../shared/progressLine/renderSubagentLine.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowEnabled } from '../shared/workflowHost/workflowEnabled.js';
import { workflowIdentity } from '../shared/workflowHost/workflowIdentity.js';
import { workflowMainIdentity } from '../shared/workflowHost/workflowMainIdentity.js';

/**
 * Anchor a child's first native turn without inheriting the parent's workflow.
 * On that first turn only, hand the child one line naming the parent
 * main actor's active task, when it has one; a resumed child gets nothing.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 */
export function processSubagentStart(
  input: SubagentStartInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
  now: number = Date.now(),
): HookOutput {
  const identity = workflowIdentity(input, adapter);
  if (!identity || !input.agent_id) return EMPTY_RESULT;

  const enabled = workflowEnabled(input.cwd);
  const firstTurn = isFirstChildTurn(identity, now);
  observeBoundary(identity, enabled, now, { firstChild: true, suspend: true });
  if (!enabled || !firstTurn) return EMPTY_RESULT;

  const parentIdentity = workflowMainIdentity(input, adapter);
  const parentBinding = parentIdentity
    ? readActorBinding(parentIdentity, now)
    : undefined;
  if (!parentBinding || parentBinding.state !== 'active') return EMPTY_RESULT;

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: renderSubagentLine(
        parentBinding.task,
        parentBinding.intent,
        parentBinding.step,
      ),
    },
  };
}
