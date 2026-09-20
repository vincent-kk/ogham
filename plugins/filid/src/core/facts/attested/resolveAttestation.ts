import { FACTS_ATTESTATION_OUTCOMES } from '../../../constants/facts.js';
import type { PendingAttestation } from '../pending/pendingPageSchema.js';
import type { FileFacts } from '../schema/fileFactsSchema.js';
import { normalizeActor } from '../sideTable/normalizeActor.js';

import { comparePendingEdges } from '../pending/comparePendingEdges.js';
import type { AttestationDifference } from '../pending/comparePendingEdges.js';
import { findUnaccountedLines } from './findUnaccountedLines.js';

/** What one attested submission is judged against. */
export interface AttestationInput {
  /** The attested record, already past the hash, string and path checks. */
  facts: FileFacts;
  /** That file's pending attestation, or undefined when it has none. */
  pending: PendingAttestation | undefined;
  /** The file's current contents split into lines, in order. */
  lines: readonly string[];
  /** Self-declared actor of this submission. */
  actor: string;
}

/** What an attested submission did, as one of the table's cells. */
export type AttestationResolution =
  | { outcome: typeof FACTS_ATTESTATION_OUTCOMES.PENDING }
  | { outcome: typeof FACTS_ATTESTATION_OUTCOMES.REPLACED }
  | { outcome: typeof FACTS_ATTESTATION_OUTCOMES.CONFIRMED }
  | {
      outcome: typeof FACTS_ATTESTATION_OUTCOMES.SAME_ACTOR;
      differences: AttestationDifference[];
    }
  | {
      outcome: typeof FACTS_ATTESTATION_OUTCOMES.MISMATCH;
      differences: AttestationDifference[];
    }
  | { unaccountedLines: number[] };

/**
 * Decide what one attested submission does to its file (spec §4.6).
 *
 * Pure: every filesystem fact the decision needs arrives as an argument, so the
 * cells of `evidence/s3a-attested-states.md` can be exercised without a project
 * on disk.
 *
 * The order is the contract. Accounting comes first, because a record that
 * leaves a matching line unexplained is not a claim about the file at all and
 * must not touch what is already held. A pending attestation made against other
 * bytes has expired — a confirmation is agreement about one text — so it is
 * dropped and this submission becomes the new first one. The actor is checked
 * before the edges because a reader confirming itself has read nothing twice,
 * whatever it found. Only then does agreement decide, and disagreement stores
 * NOTHING and changes NOTHING: replacing the pending attestation would let two
 * actors overwrite each other forever, and `discard-pending` is the deliberate
 * way out (P5).
 *
 * @param input - The submission, what is held, the bytes and who is claiming.
 * @returns The cell this submission lands in.
 */
export function resolveAttestation(
  input: AttestationInput,
): AttestationResolution {
  const unaccountedLines = findUnaccountedLines(input.lines, input.facts);
  if (unaccountedLines.length > 0) return { unaccountedLines };
  const { pending } = input;
  if (pending === undefined)
    return { outcome: FACTS_ATTESTATION_OUTCOMES.PENDING };
  if (pending.contentHash !== input.facts.contentHash)
    return { outcome: FACTS_ATTESTATION_OUTCOMES.REPLACED };
  const differences = comparePendingEdges(pending.facts, input.facts);
  if (normalizeActor(pending.actor) === normalizeActor(input.actor))
    return { outcome: FACTS_ATTESTATION_OUTCOMES.SAME_ACTOR, differences };
  if (differences.length === 0)
    return { outcome: FACTS_ATTESTATION_OUTCOMES.CONFIRMED };
  return { outcome: FACTS_ATTESTATION_OUTCOMES.MISMATCH, differences };
}
