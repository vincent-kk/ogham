import { ELECTION_RENDER } from '../../../../constants/intervention.js';
import type { InterventionLevel } from '../../../../types/config.js';

/**
 * D7-E (Arm S): the election line for a dial position. `undefined` at
 * `advisory` — the caller renders silence, keeping that dial position
 * exactly as the dispatch measurements were taken against.
 *
 * Separate from `renderPostureLines` because the two are gated
 * differently: posture lines ride along with the deployed-rule status,
 * this one is gated on the dial alone and renders in both the SessionStart
 * and the SubagentStart compact path.
 */
export function renderElectionLine(
  level: InterventionLevel,
): string | undefined {
  return ELECTION_RENDER[level as keyof typeof ELECTION_RENDER];
}
