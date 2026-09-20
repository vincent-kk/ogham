import {
  FACTS_ADJUDICATION_STATES,
  FACTS_DECISIONS,
} from '../../../constants/facts.js';

import { normalizeActor } from './normalizeActor.js';
import type {
  AdjudicationDecision,
  AdjudicationItem,
  AdjudicationState,
} from './types/adjudicationTypes.js';

/** What one decision does to one item. */
export interface AdjudicationOutcome {
  /** The item's state afterwards; unchanged states are reported, not hidden. */
  state: AdjudicationState;
  /** The actor now attached to the item, if any. */
  actor?: string;
  /** Whether the call changed anything. */
  changed: boolean;
  /** What the caller does next; empty when nothing is owed. */
  nextAction: string;
}

/** Who decided, relative to the actor already on the item. */
type Actor = 'same' | 'different';

/** One cell of the table in `evidence/s3a-adjudication-states.md`. */
type Cell = (actor: Actor, decision: AdjudicationDecision) => AdjudicationOutcome;

const CONFIRM_DISMISS =
  'A dismissal is confirmed by a different actor. Have the skill stand up a separate subagent, let it read only the lines this item names, and adjudicate from there.';

const REOPEN_BY_RECORD =
  'This edge is in the submitted record, so there is nothing to judge. Submit a record for this file without that reference and the item returns as coverage-shrank.';

/**
 * Settled outcome for a decision that needs no confirmation.
 * @param state Resulting state.
 * @param changed Whether this call moved the item.
 * @returns The outcome with no action owed.
 */
const settled = (
  state: AdjudicationState,
  changed: boolean,
): AdjudicationOutcome => ({ state, changed, nextAction: '' });

/**
 * The transition table, one entry per current state.
 *
 * A table rather than a condition ladder because the contract IS a table: the
 * cells are enumerated in `evidence/s3a-adjudication-states.md` and each one has
 * a test, so a missing case is a missing key here rather than a branch nobody
 * noticed.
 */
const TRANSITIONS: Record<AdjudicationState, Cell> = {
  [FACTS_ADJUDICATION_STATES.UNADJUDICATED]: (_actor, decision) =>
    decision === FACTS_DECISIONS.ADOPT
      ? settled(FACTS_ADJUDICATION_STATES.ADOPTED, true)
      : {
          state: FACTS_ADJUDICATION_STATES.PENDING_DISMISS,
          changed: true,
          nextAction: CONFIRM_DISMISS,
        },
  [FACTS_ADJUDICATION_STATES.PENDING_DISMISS]: (actor, decision) => {
    if (decision === FACTS_DECISIONS.ADOPT)
      return settled(FACTS_ADJUDICATION_STATES.ADOPTED, true);
    return actor === 'different'
      ? settled(FACTS_ADJUDICATION_STATES.DISMISSED, true)
      : {
          state: FACTS_ADJUDICATION_STATES.PENDING_DISMISS,
          changed: false,
          nextAction: CONFIRM_DISMISS,
        };
  },
  [FACTS_ADJUDICATION_STATES.ADOPTED]: (_actor, decision) =>
    decision === FACTS_DECISIONS.ADOPT
      ? settled(FACTS_ADJUDICATION_STATES.ADOPTED, false)
      : {
          state: FACTS_ADJUDICATION_STATES.PENDING_DISMISS,
          changed: true,
          nextAction: CONFIRM_DISMISS,
        },
  [FACTS_ADJUDICATION_STATES.DISMISSED]: (_actor, decision) =>
    decision === FACTS_DECISIONS.ADOPT
      ? settled(FACTS_ADJUDICATION_STATES.ADOPTED, true)
      : settled(FACTS_ADJUDICATION_STATES.DISMISSED, false),
  [FACTS_ADJUDICATION_STATES.CLOSED_BY_RECORD]: () => ({
    state: FACTS_ADJUDICATION_STATES.CLOSED_BY_RECORD,
    changed: false,
    nextAction: REOPEN_BY_RECORD,
  }),
};

/**
 * Apply one actor's decision to one side-table item (spec §4.5).
 *
 * Pure. The asymmetry it encodes is the whole point: adding an edge takes one
 * actor because a wrong `adopt` shows up as a false finding, while removing one
 * takes two because a wrong `dismiss` hides a real import from the very
 * comparison that would have caught it. Where the two disagree the edge stays.
 *
 * Re-adjudication is always allowed, so neither a wrong `adopt` nor a wrong
 * `dismiss` can set into a demand nobody can satisfy (P5); an adopted edge stays
 * valid until a dismissal is confirmed.
 *
 * @param item - The item as stored, carrying its state and pending actor.
 * @param decision - What this actor claims.
 * @param actor - Self-declared actor identity; the server cannot verify it, and
 * the threat model is an honest agent that can be wrong. Identities are folded
 * before comparison so one actor cannot confirm itself by respelling its name.
 * @returns The state afterwards, whether anything moved, and what is owed next.
 */
export function adjudicateItem(
  item: AdjudicationItem,
  decision: AdjudicationDecision,
  actor: string,
): AdjudicationOutcome {
  const held = item.actor === undefined ? null : normalizeActor(item.actor);
  const deciding = normalizeActor(actor);
  const outcome = TRANSITIONS[item.state](
    held === null || held === deciding ? 'same' : 'different',
    decision,
  );
  return outcome.state === FACTS_ADJUDICATION_STATES.PENDING_DISMISS
    ? { ...outcome, actor }
    : outcome;
}
