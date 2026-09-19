import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/facts.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

/**
 * The diagnostic for records another writer replaced during this call.
 *
 * One diagnostic for the batch rather than one per path: the recovery is the
 * same single action whatever the count, and a per-path list of a large batch
 * would crowd out the rejections that need reading.
 *
 * @param conflicted - Paths whose shard lost its compare-and-set.
 * @returns One diagnostic, or none when every write landed.
 */
export function buildConflictDiagnostics(
  conflicted: readonly string[],
): ToolDiagnostic[] {
  if (conflicted.length === 0) return [];
  return [
    {
      code: FACTS_DIAGNOSTIC_CODES.RECORD_CHANGED,
      message: `${conflicted.length} record(s) were replaced by another writer during this call and were not stored.`,
      affects: ANALYSIS_AXES,
      nextAction: FACTS_DIAGNOSTIC_NEXT_ACTIONS.RECORD_CHANGED,
    },
  ];
}
