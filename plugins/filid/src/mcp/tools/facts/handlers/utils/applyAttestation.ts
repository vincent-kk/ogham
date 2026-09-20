import {
  FACTS_ATTESTATION_NEXT_ACTIONS,
  FACTS_ATTESTATION_OUTCOMES,
  FACTS_SCHEMA_VERSION,
} from '../../../../../constants/facts.js';
import {
  agreedNonReferences,
  buildFactsRejection,
  locateSourceText,
  normalizeActor,
  resolveAttestation,
} from '../../../../../core/facts/index.js';
import type {
  AttestationDifference,
  FactsRejection,
  FileFacts,
  PendingAttestation,
} from '../../../../../core/facts/index.js';
import type { AttestedOutcome } from '../../types/factsToolTypes.js';

/** One attested record and everything deciding it needs. */
export interface AttestationRequest {
  /** The record, already past the hash, string and path checks. */
  facts: FileFacts;
  /** That file's pending attestation, or undefined when it has none. */
  pending: PendingAttestation | undefined;
  /** The file's current contents split into lines, in order. */
  lines: readonly string[];
  /** Self-declared actor of this submission, as the call carried it. */
  actor: string;
  /** JSON pointer of this record in the submitted document. */
  pointer: string;
}

/** What one attested submission does to the store. */
export interface AttestationEffect {
  /** Whether the record becomes this file's stored record. */
  store: boolean;
  /** What happens to the file's pending page. */
  pendingChange: 'keep' | 'remove' | 'replace';
  /** The page to store when `pendingChange` is `replace`. */
  page: PendingAttestation | null;
  /** The report entry, or null when the record was refused outright. */
  outcome: AttestedOutcome | null;
  /** The record-level rejection, or null. */
  rejection: FactsRejection | null;
  /**
   * Lines both attesters read as non-references, and who held the first read.
   *
   * Present only on a confirmation. An edge this record drops whose every
   * occurrence sits on one of these lines has already been judged by two
   * readers, so asking two more to dismiss it is the same ceremony twice.
   */
  agreed: { nonReferences: Map<number, string>; actor: string } | null;
}

/**
 * Turn one attested submission into what the store should do about it.
 *
 * The decision itself is `resolveAttestation`, which is pure and enumerated by
 * the cells of `evidence/s3a-attested-states.md`. What happens here is the part
 * that needs the call around it: the actor comes from the call rather than the
 * record, so a batch is one reader's work and cannot claim to be two; and a
 * refusal is turned into a rejection carrying the line numbers rather than a
 * count, because a count leaves the caller guessing which line to explain.
 *
 * @param request - The record, what is held, the bytes, the actor and pointer.
 * @returns What to store, what to do with the pending page, and what to report.
 */
export function applyAttestation(
  request: AttestationRequest,
): AttestationEffect {
  if (normalizeActor(request.actor) === null)
    return refused(
      buildFactsRejection(
        request.facts.path,
        request.pointer,
        'ATTESTED_ACTOR_REQUIRED',
      ),
    );
  const resolution = resolveAttestation({
    facts: request.facts,
    pending: request.pending,
    lines: request.lines,
    actor: request.actor,
  });
  if ('unaccountedLines' in resolution)
    return refused({
      ...buildFactsRejection(
        request.facts.path,
        request.pointer,
        'ATTESTED_UNACCOUNTED',
      ),
      lines: resolution.unaccountedLines,
    });
  const report: AttestedOutcome = {
    path: request.facts.path,
    outcome: resolution.outcome,
    ...(request.pending === undefined ? {} : { actor: request.pending.actor }),
    ...('differences' in resolution
      ? { differences: located(resolution.differences, request.lines) }
      : {}),
    nextAction: FACTS_ATTESTATION_NEXT_ACTIONS[resolution.outcome],
  };
  if (resolution.outcome === FACTS_ATTESTATION_OUTCOMES.CONFIRMED)
    return {
      store: true,
      pendingChange: 'remove',
      page: null,
      outcome: report,
      rejection: null,
      agreed:
        request.pending === undefined
          ? null
          : {
              nonReferences: agreedNonReferences(
                request.pending.facts,
                request.facts,
              ),
              actor: request.pending.actor,
            },
    };
  if (
    resolution.outcome === FACTS_ATTESTATION_OUTCOMES.PENDING ||
    resolution.outcome === FACTS_ATTESTATION_OUTCOMES.REPLACED
  )
    return {
      store: false,
      pendingChange: 'replace',
      page: {
        schemaVersion: FACTS_SCHEMA_VERSION,
        path: request.facts.path,
        actor: request.actor,
        contentHash: request.facts.contentHash,
        facts: request.facts,
      },
      outcome: report,
      rejection: null,
      agreed: null,
    };
  return {
    store: false,
    pendingChange: 'keep',
    page: null,
    outcome: report,
    rejection: null,
    agreed: null,
  };
}

/**
 * The effect of a record that was refused before any state was consulted.
 * @param rejection The rejection to report.
 * @returns An effect that stores nothing and leaves the pending page alone.
 */
function refused(rejection: FactsRejection): AttestationEffect {
  return {
    store: false,
    pendingChange: 'keep',
    page: null,
    outcome: null,
    rejection,
    agreed: null,
  };
}

/**
 * Attach the lines each differing reference occurs on in the current file.
 * @param differences References only one attestation carries.
 * @param lines The file's current contents, split into lines.
 * @returns The same differences, each with the lines a reader should open.
 */
function located(
  differences: readonly AttestationDifference[],
  lines: readonly string[],
): (AttestationDifference & { lines: number[] })[] {
  return differences.map((difference) => ({
    ...difference,
    lines: locateSourceText(lines, difference.reference),
  }));
}
