import { ELECTION_RENDER } from '../../../../constants/intervention.js';
import type { InterventionLevel } from '../../../../types/config.js';

/**
 * D7-E (Arm S): the SubagentStart-only election line for a dial position.
 * `undefined` at `advisory` — the caller renders silence, keeping that
 * dial position exactly as the dispatch measurements were taken against.
 *
 * Separate from `renderPostureLines`: that one feeds the SessionStart
 * render (unchanged by this experiment), this one feeds only the
 * SubagentStart compact render.
 */
export function renderElectionLine(
  level: InterventionLevel,
): string | undefined {
  return ELECTION_RENDER[level as keyof typeof ELECTION_RENDER];
}
