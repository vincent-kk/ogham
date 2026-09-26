import { INTERVENTION } from './intervention.js';

/**
 * Returned by the settings MCP tool's config posture echo at standard and
 * strict.
 */
export const ELECTION_STANDARD_LINE =
  'Start or resume a workflow only when continuing a selected task; ordinary explanations and standalone reviews need no activation.';

/** Disabled positions do not offer automatic workflow observations. */
export const ELECTION_RENDER = {
  [INTERVENTION.STANDARD]: ELECTION_STANDARD_LINE,
  [INTERVENTION.STRICT]: ELECTION_STANDARD_LINE,
} as const;
