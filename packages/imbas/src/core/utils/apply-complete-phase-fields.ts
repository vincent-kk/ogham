import type { RunState, RunTransition, PhaseName } from '../../types/state.js';

export function applyCompletePhaseFields(
  updated: RunState,
  phase: PhaseName,
  action: Extract<RunTransition, { action: 'complete_phase' }>,
): void {
  if (phase === 'validate') {
    if (action.result !== undefined) {
      updated.phases.validate.result = action.result;
    }
    if (action.blocking_issues !== undefined) {
      updated.phases.validate.blocking_issues = action.blocking_issues;
    }
    if (action.warning_issues !== undefined) {
      updated.phases.validate.warning_issues = action.warning_issues;
    }
  } else if (phase === 'split') {
    if (action.stories_created !== undefined) {
      updated.phases.split.stories_created = action.stories_created;
    }
    if (action.pending_review !== undefined) {
      updated.phases.split.pending_review = action.pending_review;
    }
  } else if (phase === 'devplan') {
    if (action.result !== undefined) {
      updated.phases.devplan.result = action.result;
    }
    if (action.pending_review !== undefined) {
      updated.phases.devplan.pending_review = action.pending_review;
    }
  }
}
