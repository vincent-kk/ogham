import { FACTS_FILE_STATES, FACTS_UNKNOWN_CAUSES } from '../../../constants/facts.js';
import { compareByBytes } from '../../../lib/compareByBytes.js';
import type { UnknownFile } from '../../../types/fractal.js';

import type { FactsFileState } from './classifyFactsFile.js';

/** The cause code each unknown state contributes, keyed by the state itself. */
const CAUSE_BY_STATE: Partial<Record<FactsFileState, string>> = {
  [FACTS_FILE_STATES.MISSING]: FACTS_UNKNOWN_CAUSES.MISSING,
  [FACTS_FILE_STATES.NEEDS_RESOLUTION]: FACTS_UNKNOWN_CAUSES.NEEDS_RESOLUTION,
  [FACTS_FILE_STATES.UNCERTAIN]: FACTS_UNKNOWN_CAUSES.UNCERTAIN,
  [FACTS_FILE_STATES.TOOL_ERROR]: FACTS_UNKNOWN_CAUSES.TOOL_ERROR,
};

/**
 * The files whose facts filid cannot draw a conclusion from (spec §3).
 *
 * This is what the dependency graph carries instead of a scalar certainty:
 * a conclusion that requires an absence — no cycle, no boundary violation — is
 * only sound over files that are not here, and attributing the unknown to the
 * file that caused it is what lets the rest of the project still be judged (P4).
 *
 * The shape is the graph's own `UnknownFile`, so a facts-derived unknown and a
 * graph-derived one merge without translation; the file's state travels as its
 * cause code. `exact` and `unsupported` contribute none: out of scope is a
 * declared decision, not a gap.
 *
 * @param states - Every scanned file mapped to its state.
 * @returns One entry per unknown file, sorted by path, matching the graph's
 * contract.
 */
export function selectUnknownFiles(
  states: ReadonlyMap<string, FactsFileState>,
): UnknownFile[] {
  return [...states]
    .flatMap(([path, state]) => {
      const cause = CAUSE_BY_STATE[state];
      return cause === undefined ? [] : [{ path, causes: [cause] }];
    })
    .sort((left, right) => compareByBytes(left.path, right.path));
}
