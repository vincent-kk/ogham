import type {
  WorkflowBinding,
  WorkflowState,
} from '../../../../types/workflow.js';

/**
 * Advance one actor transaction's turn bookkeeping and optionally suspend
 * its binding. Shared by `observeBoundary` and entry-request seeds in
 * `observeInvocation`.
 * @param state Actor state, mutated in place.
 * @param turn Turn hash (native for the main actor, agent-stable for a child) to record as the current anchor, or
 *   `undefined` to leave the actor with no anchored turn.
 * @param suspend Whether an existing binding is suspended by this boundary.
 * @returns The binding snapshot from inside the same actor transaction.
 */
export function advanceBoundary(
  state: WorkflowState,
  turn: string | undefined,
  suspend: boolean,
): WorkflowBinding | undefined {
  state.generation++;
  state.turn = turn;
  state.invocations = {};
  state.seen = [];
  if (suspend && state.binding) state.binding.state = 'suspended';
  return state.binding;
}
