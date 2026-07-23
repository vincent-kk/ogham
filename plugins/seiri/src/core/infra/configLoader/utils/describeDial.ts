import { DEFAULT_INTERVENTION } from '../../../../constants/intervention.js';
import type { InterventionState } from '../../../../types/config.js';

/**
 * One line naming the dial in effect, and its origin when that origin is
 * a session valve rather than the committed baseline.
 *
 * A valve that outranked the repository's declared posture without saying
 * so would read as the repository having changed its mind — so the
 * override always names what it overrode.
 */
export function describeDial(state: InterventionState): string {
  if (state.source !== 'runtime') return `Intervention: ${state.effective}`;
  return `Intervention: ${state.effective} (runtime; baseline: ${
    state.baseline ?? DEFAULT_INTERVENTION
  })`;
}
