import { IDLE_STATE_TTL } from '../../../constants/retention.js';
import type { WorkflowState } from '../../../types/workflow.js';

/**
 * Whether an actor state was observed recently enough to still apply.
 * @param state Persisted actor state to check.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @returns `false` once the 14-day idle TTL has elapsed since `state.lastObservedAt`.
 */
export function isActorFresh(state: WorkflowState, now: number): boolean {
  return now - state.lastObservedAt <= IDLE_STATE_TTL;
}
