import type { PhaseName, RunState, RunTransition } from '../../types/state.js';

export function applyCompletePhaseFields(
  updated: RunState,
  phase: PhaseName,
  action: Extract<RunTransition, { action: 'complete_phase' }>,
): void {
  if (phase === 'refine') {
    if (action.result !== undefined)
      updated.phases.refine.result = action.result;

    if (action.blocking_issues !== undefined)
      updated.phases.refine.blocking_issues = action.blocking_issues;

    if (action.warning_issues !== undefined)
      updated.phases.refine.warning_issues = action.warning_issues;
  } else if (phase === 'estimate') {
    if (action.estimated_manday !== undefined)
      updated.phases.estimate.estimated_manday = action.estimated_manday;
  } else if (phase === 'split') {
    if (action.stories_created !== undefined)
      updated.phases.split.stories_created = action.stories_created;

    if (action.pending_review !== undefined)
      updated.phases.split.pending_review = action.pending_review;
  }
}
