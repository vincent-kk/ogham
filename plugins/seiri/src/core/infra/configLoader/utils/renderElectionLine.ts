import { ELECTION_RENDER } from '../../../../constants/electionLines.js';
import type { InterventionLevel } from '../../../../types/config.js';

/**
 * The workflow-participation line for a dial position, consumed by the
 * settings MCP tool's `config` posture echo. `undefined` at `off` and
 * `advisory`, where the tool renders no participation line.
 */
export function renderElectionLine(
  level: InterventionLevel,
): string | undefined {
  return ELECTION_RENDER[level as keyof typeof ELECTION_RENDER];
}
