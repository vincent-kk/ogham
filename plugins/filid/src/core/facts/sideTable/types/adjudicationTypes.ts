import type {
  FACTS_ADJUDICATION_ORIGINS,
  FACTS_ADJUDICATION_STATES,
  FACTS_DECISIONS,
} from '../../../../constants/facts.js';
import type { FACTS_REFERENCE_KINDS } from '../../../../constants/facts.js';

/** How an item came to be on the side table (spec §4.5). */
export type AdjudicationOrigin =
  (typeof FACTS_ADJUDICATION_ORIGINS)[keyof typeof FACTS_ADJUDICATION_ORIGINS];

/** Where an item stands. */
export type AdjudicationState =
  (typeof FACTS_ADJUDICATION_STATES)[keyof typeof FACTS_ADJUDICATION_STATES];

/** What an actor claims about an item. */
export type AdjudicationDecision =
  (typeof FACTS_DECISIONS)[keyof typeof FACTS_DECISIONS];

/** What identifies one item, and what a caller must send to adjudicate it. */
export interface AdjudicationKey {
  /** Project-relative POSIX path of the file the reference sits in. */
  path: string;
  /** Reference kind, as the record spells it. */
  kind: (typeof FACTS_REFERENCE_KINDS)[keyof typeof FACTS_REFERENCE_KINDS];
  /** `sourceText ?? specifier` — the bytes the provider says are in the file. */
  reference: string;
}

/** One row of the side table: an edge someone reported that no record carries. */
export interface AdjudicationItem extends AdjudicationKey {
  /** The in-project path the reference resolved to; the edge under judgement. */
  resolvedPath: string;
  origin: AdjudicationOrigin;
  state: AdjudicationState;
  /**
   * Digest of every line the reference occurs on, by the path-token rule.
   *
   * The expiry key. Binding to the whole file would expire a judgement on every
   * unrelated edit and invite reflexive dismissals; binding to these lines
   * expires it exactly when what was judged changed.
   */
  lineDigest: string;
  /** File bytes when the item was last confirmed. */
  contentHash: string;
  /** The actor whose `dismiss` is awaiting confirmation. */
  actor?: string;
  /** Why that actor says the edge is not there. */
  reason?: string;
}
