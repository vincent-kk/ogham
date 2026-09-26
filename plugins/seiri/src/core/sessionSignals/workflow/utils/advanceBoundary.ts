import type {
  WorkflowBinding,
  WorkflowState,
} from '../../../../types/workflow.js';

/**
 * Advance one actor transaction's turn bookkeeping, optionally suspending
 * its binding. Shared by `observeBoundary` (which may create metadata)
 * and `suspendActor` (which never does), so the create-capable and
 * create-free callers apply the same turn-advancing effect.
 * @param state Actor state, mutated in place.
 * @param turn Native turn hash to record as the current anchor, or
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
