import type {
  WorkflowRequest,
  WorkflowState,
} from '../../../types/workflow.js';

/** Outcome of one lifecycle request against the current binding. */
export type WorkflowTransitionResult = 'applied' | 'mismatch' | 'rejected';

/**
 * Apply one acknowledged lifecycle request; finish certifies no task outcome.
 *
 * @param state Actor state, mutated in place when the request applies.
 * @param request Explicit lifecycle request to apply.
 * @returns `'applied'` on a state change, `'mismatch'` when a non-start action
 *   names a task other than the bound one (state is left untouched), or
 *   `'rejected'` for every other unmet precondition.
 */
export function transitionWorkflow(
  state: WorkflowState,
  request: WorkflowRequest,
): WorkflowTransitionResult {
  const previous = state.binding;
  if (request.action !== 'start' && previous && previous.task !== request.task)
    return 'mismatch';
  if (request.action === 'start' || request.action === 'resume') {
    if (!request.intent) return 'rejected';
    state.binding =
      request.action === 'resume' && previous
        ? { ...previous, state: 'active', intent: request.intent }
        : {
            task: request.task,
            intent: request.intent,
            state: 'active',
            counts: {},
            announced: [],
            verdicts: {},
          };
  } else if (request.action === 'pause') {
    if (!previous) return 'rejected';
    previous.state = 'suspended';
  } else {
    if (!previous) return 'rejected';
    delete state.binding;
  }
  state.generation++;
  state.invocations = {};
  return 'applied';
}
