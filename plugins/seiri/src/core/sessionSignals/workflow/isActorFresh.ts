import type { WorkflowState } from '../../../types/workflow.js';

/** Seven days without observations retires this actor, never user ledgers. */
const ACTOR_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * Whether an actor state was observed recently enough to still apply.
 * @param state Persisted actor state to check.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @returns `false` once the seven-day actor TTL has elapsed since `state.lastObservedAt`.
 */
export function isActorFresh(state: WorkflowState, now: number): boolean {
  return now - state.lastObservedAt <= ACTOR_TTL;
}
