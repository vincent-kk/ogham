import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../../../types/toolEnvelope.js';
import type {
  FactsCompareData,
  FactsCompareSummary,
} from '../../types/factsToolTypes.js';

import { emptyComparison } from './emptyComparison.js';

/**
 * The compare answer for a project that has declared no facts scope.
 *
 * With no scope there is nothing the store stands behind, so every candidate
 * reference would read as missing and the side table would fill with items
 * about a project filid was never told to analyse (spec §2.3).
 *
 * @param projectRoot - Absolute project root, echoed into the payload.
 * @returns A payload that compared nothing, with the config edit as next action.
 */
export function buildUninitializedComparePayload(
  projectRoot: string,
): ToolPayload<FactsCompareSummary, FactsCompareData> {
  return {
    projectRoot,
    status: TOOL_STATUSES.UNSUPPORTED,
    summary: {
      comparedFiles: 0,
      missingInStore: 0,
      resolutionDiffers: 0,
      informational: 0,
      recordedItems: 0,
    openItems: 0,
      singleProvider: true,
    },
    data: emptyComparison(),
    diagnostics: [
      {
        code: FACTS_DIAGNOSTIC_CODES.UNINITIALIZED,
        message:
          'This project has no facts.covers declaration, so there is nothing for a candidate extraction to be compared against.',
        affects: ANALYSIS_AXES,
        nextAction: FACTS_DIAGNOSTIC_NEXT_ACTIONS.UNINITIALIZED,
      },
    ],
  };
}
