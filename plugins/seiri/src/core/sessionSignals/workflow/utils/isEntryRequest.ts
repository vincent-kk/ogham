import { CHAIN_ENTRY_STEPS } from '../../../../constants/workflowChain.js';
import type { WorkflowRequest } from '../../../../types/workflow.js';

/**
 * Whether a request may create a binding and seed an absent actor. Which
 * entry requests may also replace a different active task is
 * `transitionWorkflow`'s decision.
 * @param request Lifecycle request to classify.
 * @returns `true` for `start`, and for a `step` naming one of {@link CHAIN_ENTRY_STEPS}.
 */
export function isEntryRequest(request: WorkflowRequest): boolean {
  return (
    request.action === 'start' ||
    (request.action === 'step' &&
      (CHAIN_ENTRY_STEPS as readonly string[]).includes(request.step ?? ''))
  );
}
