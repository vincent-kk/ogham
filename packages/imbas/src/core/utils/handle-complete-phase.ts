import type { RunState, RunTransition } from '../../types/state.js';
import { applyCompletePhaseFields } from './apply-complete-phase-fields.js';
import { advancePhase } from './advance-phase.js';

export function handleCompletePhase(
  state: RunState,
  action: Extract<RunTransition, { action: 'complete_phase' }>,
  now: string,
): RunState {
  const phase = action.phase;
  if (state.phases[phase].status !== 'in_progress') {
    throw new Error(
      `Cannot complete phase "${phase}": current status is "${state.phases[phase].status}", expected "in_progress"`,
    );
  }
  const updated = structuredClone(state);
  updated.phases[phase].status = 'completed';
  updated.phases[phase].completed_at = now;
  updated.updated_at = now;

  // Apply phase-specific fields
  applyCompletePhaseFields(updated, phase, action);

  // Advance current_phase to next
  updated.current_phase = advancePhase(phase);
  return updated;
}
