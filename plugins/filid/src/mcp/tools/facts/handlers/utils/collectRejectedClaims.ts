import { FACTS_REJECTION_NEXT_ACTIONS } from '../../../../../constants/facts.js';
import type { RejectedClaim } from '../../types/factsToolTypes.js';

import type { FactsContext } from './buildFactsContext.js';

/**
 * Every claim the store refused, with the action that changes each outcome.
 *
 * Item-level for the reason `status` lists open items item-level: a session
 * that never saw the submit call which refused them has to be able to act from
 * this response alone. A path list would send it to re-run the extraction, and
 * a content-based refusal — a reference string that is not in the file — comes
 * back identically from the same tool, so the whole round trip is wasted before
 * anything is learned (P5).
 *
 * The sentence is looked up from the code here rather than stored with the
 * record, so improving the wording does not leave old records saying the old
 * thing.
 *
 * @param context - Scanned paths and the records read for this call.
 * @returns One entry per refused claim, grouped by file in scanned order.
 */
export function collectRejectedClaims(context: FactsContext): RejectedClaim[] {
  const claims: RejectedClaim[] = [];
  for (const path of context.scannedPaths)
    for (const rejection of context.records.get(path)?.record.rejectedClaims ??
      [])
      claims.push({
        path,
        code: rejection.code,
        nextAction: FACTS_REJECTION_NEXT_ACTIONS[rejection.code],
        ...(rejection.specifier === undefined
          ? {}
          : { specifier: rejection.specifier }),
        ...(rejection.inputPath === undefined
          ? {}
          : { inputPath: rejection.inputPath }),
        ...(rejection.lines === undefined ? {} : { lines: rejection.lines }),
      });
  return claims;
}
