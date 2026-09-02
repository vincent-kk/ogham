import { ELECTION_RENDER } from '../../../../constants/electionLines.js';
import type { InterventionLevel } from '../../../../types/config.js';

/**
 * D7-E (Arm S): the election line for a dial position. `undefined` at
 * `off` and `advisory`, where callers render no workflow election.
 *
 * Separate from `renderPostureLines` because the two are gated
 * differently: posture lines ride along with the deployed-rule status,
 * this one is gated on the dial alone and renders on every surface that
 * echoes the dial — SessionStart, the SubagentStart compact path, and the
 * `rule_docs_sync` config posture echo.
 */
export function renderElectionLine(
  level: InterventionLevel,
): string | undefined {
  return ELECTION_RENDER[level as keyof typeof ELECTION_RENDER];
}
