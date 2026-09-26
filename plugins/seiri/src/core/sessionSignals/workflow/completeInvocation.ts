import type {
  WorkflowIdentity,
  WorkflowInvocation,
  WorkflowState,
} from '../../../types/workflow.js';

import { withWorkflowState } from './withWorkflowState.js';

/**
 * Consume the paired pre observation before applying effects under the same lock.
 * @param identity Host-normalized actor identity; both `turn` and `call` must be set or the call is a no-op.
 * @param inputHash Hash of the current invocation's input, matched against the stored pre observation.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @param complete Callback invoked with the actor state and the matched invocation, run only when the paired pre observation is found and still valid.
 * @returns The callback's result, or `undefined` when identity is incomplete, no matching invocation is pending, or the actor transaction fails.
 */
export function completeInvocation<T>(
  identity: WorkflowIdentity,
  inputHash: string,
  now: number,
  complete: (state: WorkflowState, invocation: WorkflowInvocation) => T,
): T | undefined {
  if (!identity.turn || !identity.call) return undefined;
  return withWorkflowState(identity, false, now, (state) => {
    const invocation = state.invocations[identity.call!];
    if (
      !invocation ||
      state.turn !== identity.turn ||
      invocation.turn !== identity.turn ||
      invocation.generation !== state.generation ||
      invocation.inputHash !== inputHash
    )
      return undefined;
    delete state.invocations[identity.call!];
    return complete(state, invocation);
  });
}
