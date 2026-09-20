import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { FACTS_FILE_STATES } from '../../../constants/facts.js';
import type { StoredFactsRecord } from '../schema/storedFactsRecordSchema.js';

/** One file's facts state (spec §3). */
export type FactsFileState =
  (typeof FACTS_FILE_STATES)[keyof typeof FACTS_FILE_STATES];

/** What classifying one file needs to know, gathered by the caller. */
export interface FactsFileEvidence {
  /** Project-relative POSIX path. */
  path: string;
  /** Whether the declared scope covers this path. */
  inScope: boolean;
  /** The stored record, or null when none is readable. */
  record: StoredFactsRecord | null;
  /** Whether the record's `contentHash` still matches the file's bytes. */
  syntaxValid: boolean;
  /**
   * Whether every input the record declared still hashes to what it declared.
   * False narrows re-resolution to the records that named the changed file,
   * which the project epoch cannot do.
   */
  resolutionInputsValid: boolean;
  /**
   * Whether the side table holds an item for this file nobody has settled.
   *
   * An unadjudicated or `pending-dismiss` item is a reported edge the record
   * does not carry, so the file's references are not yet agreed (spec §3).
   */
  hasOpenItems: boolean;
  /**
   * Whether an attested submission for this file is waiting on a second actor.
   *
   * It outranks `missing` because the next action differs: the file is not
   * waiting for an extraction, it is waiting for a different reader to confirm
   * what one already wrote (spec §4.6).
   */
  hasPendingAttestation: boolean;
}

/**
 * Decide one file's state from its record and the project's current epoch.
 *
 * Pure: every filesystem fact the decision needs arrives in `evidence`, so the
 * spec §3 table can be read straight off this function and exercised without a
 * project on disk. The order encodes the table's precedence — scope is a
 * positive declaration that outranks everything, an unbound record is no record,
 * a stale epoch or a moved declared input is reported before any judgement
 * drawn from resolutions, and a tool failure outranks the uncertainty it causes.
 *

 * @param evidence - The file, its record and whether that record still binds.
 * @param currentEpoch - The project's resolution epoch right now.
 * @returns The file's state.
 */
export function classifyFactsFile(
  evidence: FactsFileEvidence,
  currentEpoch: string,
): FactsFileState {
  if (!evidence.inScope) return FACTS_FILE_STATES.UNSUPPORTED;
  if (evidence.hasPendingAttestation) return FACTS_FILE_STATES.UNCERTAIN;
  const { record } = evidence;
  if (record === null || !evidence.syntaxValid)
    return FACTS_FILE_STATES.MISSING;
  if (record.resolutionEpoch !== currentEpoch || !evidence.resolutionInputsValid)
    return FACTS_FILE_STATES.NEEDS_RESOLUTION;
  if (record.facts.toolError !== undefined)
    return FACTS_FILE_STATES.TOOL_ERROR;
  if (
    evidence.hasOpenItems ||
    record.rejectedClaims.length > 0 ||
    hasIndeterminateReference(record)
  )
    return FACTS_FILE_STATES.UNCERTAIN;
  return FACTS_FILE_STATES.EXACT;
}

/**
 * Whether any stored reference is one the provider could not vouch for.
 * @param record Stored record to inspect.
 * @returns True when a reference carries `indeterminate` certainty.
 */
function hasIndeterminateReference(record: StoredFactsRecord): boolean {
  return record.facts.references.some(
    (reference) =>
      reference.certainty === ANALYSIS_CERTAINTIES.INDETERMINATE,
  );
}
