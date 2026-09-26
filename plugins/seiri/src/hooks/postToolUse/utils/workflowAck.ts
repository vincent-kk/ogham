import type { WorkflowTransitionResult } from '../../../core/sessionSignals/workflow/transitionWorkflow.js';
import type {
  WorkflowRequest,
  WorkflowState,
} from '../../../types/workflow.js';
import { renderCreatedAck } from '../../shared/progressLine/renderCreatedAck.js';
import { renderMismatchNotice } from '../../shared/progressLine/renderMismatchNotice.js';
import { renderSwitchedAck } from '../../shared/progressLine/renderSwitchedAck.js';

import { controlVerbAck } from './controlVerbAck.js';

/**
 * The workflow acknowledgment or mismatch line for one applied
 * transition, or `undefined` for a silent outcome (`rejected`, or a
 * same-task `step`'s `updated`).
 * @param outcome Result `transitionWorkflow` returned for `request`.
 * @param request The applied lifecycle request.
 * @param state Actor state after `transitionWorkflow` ran.
 * @param previousTask The bound task before this transition, when one existed.
 * @returns The line to inject, or `undefined` for a silent outcome.
 */
export function workflowAck(
  outcome: WorkflowTransitionResult,
  request: WorkflowRequest,
  state: WorkflowState,
  previousTask: string | undefined,
): string | undefined {
  if (outcome === 'rejected') return undefined;
  if (outcome === 'mismatch')
    return renderMismatchNotice(
      request.task,
      state.binding?.task ?? previousTask ?? '',
    );
  const binding = state.binding;
  if (outcome === 'created')
    return (
      binding && renderCreatedAck(binding.task, binding.intent, binding.step)
    );
  if (outcome === 'switched')
    return (
      binding &&
      renderSwitchedAck(
        binding.task,
        previousTask ?? '',
        binding.intent,
        binding.step,
      )
    );
  return request.action === 'step' ? undefined : controlVerbAck(request);
}
