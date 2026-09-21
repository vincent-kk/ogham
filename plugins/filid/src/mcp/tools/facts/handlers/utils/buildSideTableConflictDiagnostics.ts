import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_JUDGEMENTS_UNREADABLE_NEXT_ACTION,
  FACTS_SIDE_TABLE_CONFLICT_NEXT_ACTIONS,
  FACTS_UNKNOWN_CAUSES,
} from '../../../../../constants/facts.js';
import type { FACTS_ACTIONS } from '../../../../../constants/facts.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

/** The actions that write the side table, and so can lose one of its pages. */
type WritingAction =
  | typeof FACTS_ACTIONS.SUBMIT
  | typeof FACTS_ACTIONS.COMPARE
  | typeof FACTS_ACTIONS.ADJUDICATE;

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
 * A damaged shard's pages are reported separately, under
 * `facts-judgements-unreadable`: retrying the losing action cannot fix
 * damage the way it fixes a lost compare-and-set, so that diagnostic points
 * to discarding the shard instead.
 *
 * @param conflicted - Paths whose shard lost its compare-and-set.
 * @param damaged - Paths whose shard is damaged, so this call could not write it.
 * @param action - The action that lost them.
 * @returns One diagnostic per non-empty list, or none when every page landed.
 */
export function buildSideTableConflictDiagnostics(
  conflicted: readonly string[],
  damaged: readonly string[],
  action: WritingAction,
): ToolDiagnostic[] {
  const diagnostics: ToolDiagnostic[] = [];
  if (conflicted.length > 0)
    diagnostics.push({
      code: FACTS_DIAGNOSTIC_CODES.SIDE_TABLE_CHANGED,
      message: `Another writer replaced the side table for ${conflicted.length} file(s) during this call, so their items were not stored: ${conflicted.slice(0, 10).join(', ')}.`,
      affects: ANALYSIS_AXES,
      nextAction: FACTS_SIDE_TABLE_CONFLICT_NEXT_ACTIONS[action],
    });
  if (damaged.length > 0)
    diagnostics.push({
      code: FACTS_UNKNOWN_CAUSES.JUDGEMENTS_UNREADABLE,
      message: `The side-table shard for ${damaged.length} file(s) is damaged, so their items were not stored: ${damaged.slice(0, 10).join(', ')}.`,
      affects: ANALYSIS_AXES,
      nextAction: FACTS_JUDGEMENTS_UNREADABLE_NEXT_ACTION,
    });
  return diagnostics;
}
