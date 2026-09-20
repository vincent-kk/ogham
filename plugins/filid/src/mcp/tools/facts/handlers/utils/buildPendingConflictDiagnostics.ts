import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/facts.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

/**
 * The diagnostic for pending attestations another writer took during this call.
 *
 * A lost pending page is not harmless: the attestation it would have held is
 * the work a second reader is supposed to confirm, and losing it silently turns
 * a file that was one submission from settled into one nobody is waiting on.
 * Re-submitting the same attested record is safe — it either becomes the first
 * one again or confirms what is now there.
 *
 * @param conflicted - Paths whose pending shard lost its compare-and-set.
 * @returns One diagnostic, or none when every page landed.
 */
export function buildPendingConflictDiagnostics(
  conflicted: readonly string[],
): ToolDiagnostic[] {
  if (conflicted.length === 0) return [];
  return [
    {
      code: FACTS_DIAGNOSTIC_CODES.PENDING_CHANGED,
      message: `Another writer replaced the pending attestation for ${conflicted.length} file(s) during this call, so nothing was stored for them: ${conflicted.slice(0, 10).join(', ')}.`,
      affects: ANALYSIS_AXES,
      nextAction: FACTS_DIAGNOSTIC_NEXT_ACTIONS.PENDING_CHANGED,
    },
  ];
}
