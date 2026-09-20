import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/facts.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

/**
 * Report judgements discarded with the files they were recorded against.
 *
 * A file that leaves the tree or the scope takes its page with it, and an
 * adopted edge is an edge the graph carried — losing one changes the answer.
 * The removal is correct and nothing can be owed for it, so this reports rather
 * than blocks (S6 R-3); what the next action covers is the one case where the
 * file did not really go away, a rename.
 *
 * @param removed - How many judged items the removed pages held.
 * @returns One diagnostic, or none when no judgement was discarded.
 */
export function buildRemovedAdjudicationDiagnostics(
  removed: number,
): ToolDiagnostic[] {
  if (removed === 0) return [];
  return [
    {
      code: FACTS_DIAGNOSTIC_CODES.ADJUDICATED_ITEMS_REMOVED,
      message: `${removed} adjudicated side-table item(s) were removed with files that left the scanned tree or the facts scope.`,
      affects: ANALYSIS_AXES,
      nextAction: FACTS_DIAGNOSTIC_NEXT_ACTIONS.ADJUDICATED_ITEMS_REMOVED,
    },
  ];
}
