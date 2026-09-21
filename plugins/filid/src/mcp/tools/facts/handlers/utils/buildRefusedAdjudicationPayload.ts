import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../../../types/toolEnvelope.js';
import type {
  FactsAdjudicateData,
  FactsAdjudicateSummary,
} from '../../types/factsToolTypes.js';

/** A refusal that costs the whole call, with the action that lifts it. */
export interface AdjudicationRefusal {
  /** Absolute project root, echoed into the payload. */
  projectRoot: string;
  /** The file the call was about. */
  sourcePath: string;
  /** Stable diagnostic code for this refusal. */
  code: string;
  /** What was wrong, without quoting any submitted bytes. */
  message: string;
  /** The one action that changes the state this refusal reports. */
  nextAction: string;
}

/**
 * Refuse a whole adjudicate call before any decision lands.
 *
 * All of it, not the items that happen to still be valid: the caller read one
 * version of the file and decided from it under one identity, so a defect in
 * either undermines every decision in the call (spec §2.4).
 *
 * @param refusal - What the call was, what was wrong and what fixes it.
 * @returns A payload that stored nothing, carrying that next action.
 */
export function buildRefusedAdjudicationPayload(
  refusal: AdjudicationRefusal,
): ToolPayload<FactsAdjudicateSummary, FactsAdjudicateData> {
  return {
    projectRoot: refusal.projectRoot,
    status: TOOL_STATUSES.INDETERMINATE,
    summary: {
      sourcePath: refusal.sourcePath,
      applied: 0,
      refused: 0,
      awaitingConfirmation: 0,
      stored: false,
    },
    data: { outcomes: [], refused: [] },
    diagnostics: [
      {
        code: refusal.code,
        message: refusal.message,
        affects: ANALYSIS_AXES,
        nextAction: refusal.nextAction,
      },
    ],
  };
}
