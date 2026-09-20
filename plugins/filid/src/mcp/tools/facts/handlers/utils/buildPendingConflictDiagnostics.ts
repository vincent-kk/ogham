import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_JUDGEMENTS_UNREADABLE_NEXT_ACTION,
  FACTS_PENDING_CONFLICT_NEXT_ACTIONS,
  FACTS_UNKNOWN_CAUSES,
} from '../../../../../constants/facts.js';
import type { FACTS_ACTIONS } from '../../../../../constants/facts.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

/** The actions that write the pending store, and so can lose one of its pages. */
type WritingAction =
  | typeof FACTS_ACTIONS.SUBMIT
  | typeof FACTS_ACTIONS.DISCARD_PENDING;

/**
 * The diagnostic for pending attestations another writer took during this call.
 *
 * A lost pending page is not harmless: the attestation it would have held is
 * the work a second reader is supposed to confirm, and losing it silently turns
 * a file that was one submission from settled into one nobody is waiting on.
 *
 * The recovery is the losing action's own work, which is why the caller names
 * it. A submission repeats the attested record — safe, because it either
 * becomes the first one again or confirms what is now there — while a discard
 * repeats the discard; telling that caller to submit the record again would ask
 * it to restore what it came to throw away (P5).
 *
 * A damaged shard's pages are reported separately, under
 * `facts-judgements-unreadable`: retrying the losing action cannot fix
 * damage the way it fixes a lost compare-and-set, so that diagnostic points
 * to discarding the shard instead.
 *
 * @param conflicted - Paths whose pending shard lost its compare-and-set.
 * @param damaged - Paths whose pending shard is damaged, so this call could
 * not write it.
 * @param action - The action that lost them.
 * @returns One diagnostic per non-empty list, or none when every page landed.
 */
export function buildPendingConflictDiagnostics(
  conflicted: readonly string[],
  damaged: readonly string[],
  action: WritingAction,
): ToolDiagnostic[] {
  const diagnostics: ToolDiagnostic[] = [];
  if (conflicted.length > 0)
    diagnostics.push({
      code: FACTS_DIAGNOSTIC_CODES.PENDING_CHANGED,
      message: `Another writer replaced the pending attestation for ${conflicted.length} file(s) during this call, so nothing was stored for them: ${conflicted.slice(0, 10).join(', ')}.`,
      affects: ANALYSIS_AXES,
      nextAction: FACTS_PENDING_CONFLICT_NEXT_ACTIONS[action],
    });
  if (damaged.length > 0)
    diagnostics.push({
      code: FACTS_UNKNOWN_CAUSES.JUDGEMENTS_UNREADABLE,
      message: `The pending shard for ${damaged.length} file(s) is damaged, so nothing was stored for them: ${damaged.slice(0, 10).join(', ')}.`,
      affects: ANALYSIS_AXES,
      nextAction: FACTS_JUDGEMENTS_UNREADABLE_NEXT_ACTION,
    });
  return diagnostics;
}
