import { FACTS_ADJUDICATION_STATES } from '../../../constants/facts.js';

import type { AdjudicationState } from './types/adjudicationTypes.js';

/**
 * Whether an item is still waiting on an actor rather than carrying a verdict.
 *
 * The two open states are what every consumer of the side table means by work:
 * `status` lists them, a file holding one is `uncertain`, and a record may settle
 * one. A judged item — adopted, dismissed or closed by a record — is none of
 * those things, and the difference is asked in enough places that spelling the
 * pair out at each of them invites the next one to spell it differently.
 *
 * @param state - The item's current state.
 * @returns True for `unadjudicated` and `pending-dismiss`, false otherwise.
 */
export function isOpenAdjudication(state: AdjudicationState): boolean {
  return (
    state === FACTS_ADJUDICATION_STATES.UNADJUDICATED ||
    state === FACTS_ADJUDICATION_STATES.PENDING_DISMISS
  );
}
