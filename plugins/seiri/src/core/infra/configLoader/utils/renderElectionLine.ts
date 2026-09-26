import { ELECTION_RENDER } from '../../../../constants/electionLines.js';
import type { InterventionLevel } from '../../../../types/config.js';

/**
 * The workflow-participation line for a dial position, consumed by the
 * runtime MCP tool's `dial` posture echo and by SessionStart's render.
 * `undefined` at `off` and `advisory`, where neither renders a
 * participation line.
 * @param level Effective intervention dial.
 * @returns The fixed election line for `standard`/`strict`, else `undefined`.
 */
export function renderElectionLine(
  level: InterventionLevel,
): string | undefined {
  return ELECTION_RENDER[level as keyof typeof ELECTION_RENDER];
}
