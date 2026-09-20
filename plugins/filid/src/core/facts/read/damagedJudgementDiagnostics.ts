import {
  FACTS_JUDGEMENTS_UNREADABLE_NEXT_ACTION,
  FACTS_UNKNOWN_CAUSES,
} from '../../../constants/facts.js';

import type { ProjectFacts } from './readProjectFacts.js';
import { compareByBytes } from '../../../lib/compareByBytes.js';

/** One report of judgements the store holds and could not read. */
export interface DamagedJudgementReport {
  /** The `facts-judgements-unreadable` cause code, for the caller's shape. */
  code: string;
  /** What did not read and what that hides, with no shard contents in it. */
  message: string;
  /** What the caller does about it; the same for every such report. */
  nextAction: string;
}

/**
 * Report every judgement shard the store could not read (spec §3).
 *
 * Separate from the file states it causes: the states say which files cannot
 * be concluded from, and these say why, which is what makes the next action
 * choosable. Named by shard file, never by content — a shard that did not
 * parse has no content to quote, and one that did not open was never read.
 *
 * @param facts - One read of the store, carrying what did not read.
 * @returns One report per damaged shard, plus one when a directory itself
 * could not be listed; empty when everything read.
 */
export function damagedJudgementDiagnostics(
  facts: ProjectFacts,
): DamagedJudgementReport[] {
  const reports = [...facts.damagedJudgementShards]
    .sort(([left], [right]) => compareByBytes(left, right))
    .map(([shard, damage]) => ({
      code: FACTS_UNKNOWN_CAUSES.JUDGEMENTS_UNREADABLE,
      message: `The judgement shard ${shard} is ${damage}, so the items and adopted edges it holds are invisible and the files it covers are reported uncertain rather than settled.`,
      nextAction: FACTS_JUDGEMENTS_UNREADABLE_NEXT_ACTION,
    }));
  return facts.judgementsDirectoryUnreadable
    ? [
        {
          code: FACTS_UNKNOWN_CAUSES.JUDGEMENTS_UNREADABLE,
          message:
            'A judgement directory under the plugin cache could not be listed, so no shard of it was read and every file in scope is reported uncertain rather than settled.',
          nextAction: FACTS_JUDGEMENTS_UNREADABLE_NEXT_ACTION,
        },
        ...reports,
      ]
    : reports;
}
