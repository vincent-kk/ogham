import { pathForCompare } from '@ogham/cross-platform';

import {
  FACTS_FILE_STATES,
  FACTS_RECORD_UNAVAILABLE_NEXT_ACTION,
  FACTS_SCOPE_EXCLUDES_JUDGED_FILE_NEXT_ACTION,
  FACTS_SECTION_UNAVAILABLE_NEXT_ACTION,
} from '../../../constants/facts.js';
import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import type { SnapshotDiagnostic } from '../../../types/fractal.js';
import type { VerificationFileFacts } from '../../../types/verification.js';
import type { FactsFileState, ProjectFacts } from '../../facts/index.js';

/** What the store answers about the discovered verification files. */
export interface FactsVerificationClaims {
  /** Role and case count keyed by `pathForCompare` of the absolute path. */
  verificationFacts: ReadonlyMap<string, VerificationFileFacts>;
  /** One entry per discovered file the store cannot answer for. */
  diagnostics: SnapshotDiagnostic[];
}

/**
 * Read the verification role and case count of each discovered file.
 *
 * Only an `exact` record with a `verification` section answers; any other
 * state is reported instead of guessed, because a verification file dropped in
 * silence takes its case cap and its contract link with it.
 *
 * A file the scope excludes is reported too, with the edit that would let it
 * be judged: the count the dependency axis reports covers files no rule needed,
 * and a discovered verification file is not one of them.
 *
 * @param projectRoot - Absolute project root the discovered paths sit under.
 * @param discoveredPaths - Absolute paths the adapters claim as verification.
 * @param facts - One read of the store against the current tree.
 * @param factsStates - Each scanned file's state, from that same read.
 * @returns The store's answers and the reports owed for the rest.
 */
export function factsVerificationClaims(
  projectRoot: string,
  discoveredPaths: readonly string[],
  facts: ProjectFacts,
  factsStates: ReadonlyMap<string, FactsFileState>,
): FactsVerificationClaims {
  const verificationFacts = new Map<string, VerificationFileFacts>();
  const diagnostics: SnapshotDiagnostic[] = [];
  for (const absolutePath of discoveredPaths) {
    const path = toProjectRelativePath(projectRoot, absolutePath);
    const state = factsStates.get(path) ?? FACTS_FILE_STATES.MISSING;
    const verification =
      facts.records.get(path)?.record.facts.verification;
    if (state === FACTS_FILE_STATES.EXACT && verification !== undefined) {
      verificationFacts.set(pathForCompare(absolutePath), verification);
      continue;
    }
    diagnostics.push({
      code: 'verification-facts-unavailable',
      message: `The facts store holds no usable verification record for ${absolutePath}: ${describeMissingRecord(state)}.`,
      path: absolutePath,
      affects: ['verification'],
      nextAction: nextActionFor(state),
    });
  }
  return { verificationFacts, diagnostics };
}

/**
 * What ends this file's silence on the verification axis.
 * @param state The file's facts state (spec §3).
 * @returns The next action that actually changes that state.
 */
function nextActionFor(state: FactsFileState): string {
  if (state === FACTS_FILE_STATES.UNSUPPORTED)
    return FACTS_SCOPE_EXCLUDES_JUDGED_FILE_NEXT_ACTION;
  if (state === FACTS_FILE_STATES.EXACT)
    return FACTS_SECTION_UNAVAILABLE_NEXT_ACTION;
  return FACTS_RECORD_UNAVAILABLE_NEXT_ACTION;
}

/**
 * Say why one discovered file has no verification facts to read.
 * @param state The file's facts state (spec §3).
 * @returns A clause naming the state, for the diagnostic's message.
 */
function describeMissingRecord(state: FactsFileState): string {
  if (state === FACTS_FILE_STATES.EXACT)
    return 'its record reports no verification section';
  if (state === FACTS_FILE_STATES.UNSUPPORTED)
    return 'the declared facts scope excludes it, so no record can exist';
  return `the file is ${state}`;
}
