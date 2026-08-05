import type { PhaseName, RunState } from '../../types/state.js';

export function validateStartPhase(state: RunState, phase: PhaseName): void {
  if (phase === 'refine')
    // always allowed
    return;

  const refine = state.phases.refine;
  const refinePassed =
    refine.status === 'completed' &&
    (refine.result === 'PASS' || refine.result === 'PASS_WITH_WARNINGS');

  if (phase === 'estimate') {
    if (!refinePassed)
      throw new Error(
        `Cannot start phase "estimate": refine status is "${refine.status}", result is "${refine.result}". ` +
          `Expected: refine completed with PASS or PASS_WITH_WARNINGS`,
      );

    return;
  }

  if (phase === 'split') {
    if (!refinePassed)
      throw new Error(
        `Cannot start phase "split": refine status is "${refine.status}", result is "${refine.result}". ` +
          `Expected: refine completed with PASS or PASS_WITH_WARNINGS`,
      );

    const estimate = state.phases.estimate;
    if (estimate.status !== 'completed' && estimate.status !== 'skipped')
      throw new Error(
        `Cannot start phase "split": estimate status is "${estimate.status}". ` +
          `Expected: estimate completed or skipped (use skip_phases to skip it)`,
      );

    return;
  }
}
