import type {
  WorkflowIdentity,
  WorkflowInvocation,
  WorkflowRequest,
  WorkflowState,
} from '../../../types/workflow.js';

import { withWorkflowState } from './withWorkflowState.js';

/** Silently replace a trusted turn anchor; inactive dials only revoke existing metadata. */
export function observeBoundary(
  identity: WorkflowIdentity,
  enabled: boolean,
  firstChild = false,
): void {
  withWorkflowState(
    identity,
    enabled && !!identity.turn,
    (state) => {
      if (firstChild && state.generation > 0) enabled = false;
      state.generation++;
      state.turn = enabled ? identity.turn : undefined;
      state.invocations = {};
      state.seen = [];
      if (state.binding) state.binding.state = 'suspended';
    },
    true,
  );
}

/** Record an invocation only under the already observed native turn. */
export function observeInvocation(
  identity: WorkflowIdentity,
  inputHash: string,
  request?: WorkflowRequest,
): void {
  if (!identity.turn || !identity.call) return;
  withWorkflowState(identity, false, (state) => {
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
      startedAt: Date.now(),
      kind: request ? 'workflow' : 'bash',
      ...(request ? { request } : {}),
    };
  });
}

/** Consume the paired pre observation before applying effects under the same lock. */
export function completeInvocation<T>(
  identity: WorkflowIdentity,
  inputHash: string,
  complete: (state: WorkflowState, invocation: WorkflowInvocation) => T,
): T | undefined {
  if (!identity.turn || !identity.call) return undefined;
  return withWorkflowState(identity, false, (state) => {
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

/** Apply one acknowledged lifecycle request; finish certifies no task outcome. */
export function transitionWorkflow(
  state: WorkflowState,
  request: WorkflowRequest,
): boolean {
  const previous = state.binding;
  if (request.action !== 'start' && previous && previous.task !== request.task)
    return false;
  if (request.action === 'start' || request.action === 'resume') {
    if (!request.intent) return false;
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
    if (!previous) return false;
    previous.state = 'suspended';
  } else {
    if (!previous) return false;
    delete state.binding;
  }
  state.generation++;
  state.invocations = {};
  return true;
}
