import { CHAIN_ENTRY_STEPS } from '../../../constants/workflowChain.js';
import type { WorkflowRequest, WorkflowState } from '../../../types/workflow.js';

import { freshBinding } from './utils/freshBinding.js';

/** Outcome of one lifecycle request against the current binding. */
export type WorkflowTransitionResult =
  | 'created'
  | 'switched'
  | 'updated'
  | 'mismatch'
  | 'rejected';

/**
 * Whether a request may create a binding or replace a different bound task.
 * @param request Lifecycle request to classify.
 * @returns `true` for `start`, and for a `step` request naming one of {@link CHAIN_ENTRY_STEPS}.
 */
function isEntry(request: WorkflowRequest): boolean {
  return (
    request.action === 'start' ||
    (request.action === 'step' &&
      (CHAIN_ENTRY_STEPS as readonly string[]).includes(request.step ?? ''))
  );
}

/**
 * Apply one acknowledged lifecycle request; finish certifies no task outcome.
 *
 * @param state Actor state, mutated in place when the request applies.
 * @param request Explicit lifecycle request to apply.
 * @returns `'created'` for a brand new binding, or for a `start` that names
 *   the already-bound task (a full restart from scratch, not an in-place
 *   update); `'switched'` when an entry `step` or `start` replaces a
 *   different bound task (a fresh binding, counts and verdicts reset);
 *   `'updated'` when a same-task `step` refreshes its recorded step without
 *   touching generation or in-flight invocations, for a same-task `resume`
 *   (generation and invocations untouched), or for a same-task `pause` or
 *   `finish` (generation bumped and in-flight invocations cleared, as for
 *   `created`/`switched`); `'mismatch'` when a non-entry
 *   request names a task other than the bound one (state is left
 *   untouched); or `'rejected'` for every other unmet precondition —
 *   including a `resume` or non-entry `step` with no prior binding, which
 *   never creates one.
 */
export function transitionWorkflow(
  state: WorkflowState,
  request: WorkflowRequest,
): WorkflowTransitionResult {
  const previous = state.binding;
  const entry = isEntry(request);
  const sameTask = previous?.task === request.task;
  if (previous && !sameTask && !entry) return 'mismatch';
  if (!previous && !entry) return 'rejected';

  if (request.action === 'step' || request.action === 'start') {
    if (!request.intent) return 'rejected';
    if (previous && sameTask && request.action === 'step') {
      previous.state = 'active';
      if (request.step) previous.step = request.step;
      return 'updated';
    }
    state.binding = freshBinding(request, request.intent);
    state.generation++;
    state.invocations = {};
    return previous && !sameTask ? 'switched' : 'created';
  }

  // `previous` is defined here: the guard above rejects every non-entry
  // action (resume, pause, finish) that reaches this point with no binding.
  if (request.action === 'resume') {
    previous!.state = 'active';
    if (request.intent) previous!.intent = request.intent;
    return 'updated';
  }
  if (request.action === 'pause') {
    previous!.state = 'suspended';
    state.generation++;
    state.invocations = {};
    return 'updated';
  }
  delete state.binding;
  state.generation++;
  state.invocations = {};
  return 'updated';
}
