import { FACTS_FILE_STATES } from '../../../constants/facts.js';

import type { FactsFileState } from './classifyFactsFile.js';

/** States that make a file unknown, so the set and the spec §3 union match. */
const UNKNOWN_STATES: ReadonlySet<FactsFileState> = new Set([
  FACTS_FILE_STATES.MISSING,
  FACTS_FILE_STATES.NEEDS_RESOLUTION,
  FACTS_FILE_STATES.UNCERTAIN,
  FACTS_FILE_STATES.TOOL_ERROR,
]);

/**
 * The files whose facts filid cannot draw a conclusion from (spec §3).
 *
 * This is what the dependency graph carries instead of a scalar certainty:
 * a conclusion that requires an absence — no cycle, no boundary violation — is
 * only sound over files that are not here, and attributing the unknown to the
 * file that caused it is what lets the rest of the project still be judged (P4).
 * `unsupported` is deliberately absent: out of scope is a declared decision, not
 * a gap.
 *
 * @param states - Every in-scope file mapped to its state.
 * @returns Project-relative paths, sorted by raw UTF-8 bytes.
 */
export function selectUnknownFiles(
  states: ReadonlyMap<string, FactsFileState>,
): string[] {
  return [...states]
    .filter(([, state]) => UNKNOWN_STATES.has(state))
    .map(([path]) => path)
    .sort((left, right) =>
      Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')),
    );
}
