import type {
  WorkflowIdentity,
  WorkflowRequest,
} from '../../../types/workflow.js';

import { withWorkflowState } from './withWorkflowState.js';

/** Record an invocation only under the already observed native turn. */
export function observeInvocation(
  identity: WorkflowIdentity,
  inputHash: string,
  now: number,
  request?: WorkflowRequest,
): void {
  if (!identity.turn || !identity.call) return;
  withWorkflowState(identity, false, now, (state) => {
    if (
      state.turn !== identity.turn ||
      (!request && state.binding?.state !== 'active')
    )
      return;
    if (state.seen.includes(identity.call!)) return;
    if (
      Object.keys(state.invocations).length >= 128 ||
      state.seen.length >= 4096
    )
      return;
    state.seen.push(identity.call!);
    state.invocations[identity.call!] = {
      generation: state.generation,
      turn: identity.turn!,
      inputHash,
      startedAt: now,
      kind: request ? 'workflow' : 'bash',
      ...(request ? { request } : {}),
    };
  });
}
