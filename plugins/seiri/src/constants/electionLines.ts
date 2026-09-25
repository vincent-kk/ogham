import { INTERVENTION } from './intervention.js';

/** Compatibility name for the explicit settings participation explanation. */
export const ELECTION_STANDARD_LINE =
  'Start or resume a workflow only when continuing a selected task; ordinary explanations and standalone reviews need no activation.';

/** Strict retains the same optional participation contract. */
export const ELECTION_STRICT_LINE = ELECTION_STANDARD_LINE;

/** Disabled positions do not offer automatic workflow observations. */
export const ELECTION_RENDER = {
  [INTERVENTION.STANDARD]: ELECTION_STANDARD_LINE,
  [INTERVENTION.STRICT]: ELECTION_STRICT_LINE,
} as const;
