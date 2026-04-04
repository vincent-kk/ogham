import type { RunState, PhaseName } from '../../types/state.js';

export function validateStartPhase(state: RunState, phase: PhaseName): void {
  if (phase === 'validate') {
    // always allowed
    return;
  }

  if (phase === 'split') {
    const validate = state.phases.validate;
    if (validate.status !== 'completed') {
      throw new Error(
        `Cannot start phase "split": validate phase status is "${validate.status}", expected "completed"`,
      );
    }
    if (
      validate.result !== 'PASS' &&
      validate.result !== 'PASS_WITH_WARNINGS'
    ) {
      throw new Error(
        `Cannot start phase "split": validate result is "${validate.result}", expected PASS or PASS_WITH_WARNINGS`,
      );
    }
    return;
  }

  if (phase === 'devplan') {
    const split = state.phases.split;
    const normalPath =
      split.status === 'completed' && !split.pending_review;
    const escapePath =
      split.status === 'escaped' && split.escape_code === 'E2-3';

    if (!normalPath && !escapePath) {
      throw new Error(
        `Cannot start phase "devplan": split status is "${split.status}", ` +
          `pending_review=${split.pending_review}, escape_code=${split.escape_code}. ` +
          `Expected: split completed+not pending_review, or split escaped with E2-3`,
      );
    }
    return;
  }
}
