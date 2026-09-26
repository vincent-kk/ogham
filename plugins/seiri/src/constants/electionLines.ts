import { INTERVENTION } from './intervention.js';

/** Standard's election line, keyed on work moments rather than word signals. */
export const ELECTION_STANDARD_LINE =
  'Election: a multi-step change → seiri:write-plan; an approved plan → seiri:execute; a failure inside an active task → seiri:trace-cause; your own completion claim inside an active task → seiri:verify. A single surgical change, an explanation, or a short investigation needs no workflow.';

/** Strict's owner contract, adding review-plan, implement, request-review, and receive-review to the standard four. */
export const ELECTION_STRICT_LINE =
  'Election (strict): a multi-step change → seiri:write-plan, checked by seiri:review-plan before seiri:execute carries it out; each planned change unit → seiri:implement; a failure inside an active task → seiri:trace-cause; your own completion claim → seiri:verify; substantial finished work → seiri:request-review; review feedback → seiri:receive-review. A single surgical change, an explanation, or a short investigation needs no workflow.';

/**
 * Returned by the runtime MCP tool's dial posture echo at standard and
 * strict, and by SessionStart's render at the same positions.
 */
export const ELECTION_RENDER = {
  [INTERVENTION.STANDARD]: ELECTION_STANDARD_LINE,
  [INTERVENTION.STRICT]: ELECTION_STRICT_LINE,
} as const;
