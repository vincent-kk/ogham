import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../../../types/toolEnvelope.js';
import type {
  FactsAdjudicateData,
  FactsAdjudicateSummary,
} from '../../types/factsToolTypes.js';

/**
 * The adjudicate answer for a project whose facts scope covers nothing.
 *
 * The other three actions already answer this way, and this one has to match:
 * with no scope there are no records for an item to disagree with, so a
 * judgement would be settling a dispute about a file filid was never told to
 * analyse (spec §2.3).
 *
 * @param projectRoot - Absolute project root, echoed into the payload.
 * @param sourcePath - The file the caller tried to judge.
 * @returns A payload that judged nothing, with the config edit as next action.
 */
export function buildUninitializedAdjudicatePayload(
  projectRoot: string,
  sourcePath: string,
): ToolPayload<FactsAdjudicateSummary, FactsAdjudicateData> {
  return {
    projectRoot,
    status: TOOL_STATUSES.UNSUPPORTED,
    summary: {
      sourcePath,
      applied: 0,
      refused: 0,
      awaitingConfirmation: 0,
      stored: false,
    },
    data: { outcomes: [], refused: [] },
    diagnostics: [
      {
        code: FACTS_DIAGNOSTIC_CODES.UNINITIALIZED,
        message:
          'This project has no facts scope in effect, so the side table holds nothing to judge.',
        affects: ANALYSIS_AXES,
        nextAction: FACTS_DIAGNOSTIC_NEXT_ACTIONS.UNINITIALIZED,
      },
    ],
  };
}
