import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_SIDE_TABLE_CONFLICT_NEXT_ACTIONS,
} from '../../../../../constants/facts.js';
import type { FACTS_ACTIONS } from '../../../../../constants/facts.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

/** The actions that write the side table, and so can lose a page. */
type WritingAction = Exclude<
  (typeof FACTS_ACTIONS)[keyof typeof FACTS_ACTIONS],
  typeof FACTS_ACTIONS.STATUS
>;

/**
 * The diagnostic for side-table pages another writer took during this call.
 *
 * A lost page is not a detail to swallow: the items it held are disagreements
 * somebody reported, and dropping them silently while reporting a count is the
 * very failure the table exists to prevent. The count reported alongside this
 * diagnostic excludes the lost pages, so the number and the disk agree.
 *
 * The recovery is the losing action's own work, which is why the caller names
 * it: telling a comparison to submit again, or a judgement to re-extract, is a
 * next action that cannot be carried out (P5).
 *
 * @param conflicted - Paths whose shard lost its compare-and-set.
 * @param action - The action that lost them.
 * @returns One diagnostic, or none when every page landed.
 */
export function buildSideTableConflictDiagnostics(
  conflicted: readonly string[],
  action: WritingAction,
): ToolDiagnostic[] {
  if (conflicted.length === 0) return [];
  return [
    {
      code: FACTS_DIAGNOSTIC_CODES.SIDE_TABLE_CHANGED,
      message: `Another writer replaced the side table for ${conflicted.length} file(s) during this call, so their items were not stored: ${conflicted.slice(0, 10).join(', ')}.`,
      affects: ANALYSIS_AXES,
      nextAction: FACTS_SIDE_TABLE_CONFLICT_NEXT_ACTIONS[action],
    },
  ];
}
