import type {
  WorkflowIdentity,
  WorkflowInvocation,
  WorkflowState,
} from '../../../types/workflow.js';

import { withWorkflowState } from './withWorkflowState.js';

/** Consume the paired pre observation before applying effects under the same lock. */
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
