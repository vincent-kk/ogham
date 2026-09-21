import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import {
  FACTS_GENERATION_ID_INVALID_CODE,
  FACTS_GENERATION_ID_INVALID_NEXT_ACTION,
} from '../../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../../../types/toolEnvelope.js';
import type {
  FactsCompareData,
  FactsCompareSummary,
} from '../../types/factsToolTypes.js';

import { emptyComparison } from './emptyComparison.js';

/**
 * Refuse a comparison whose `generationId` could never name a generation.
 *
 * Checked before the value reaches a path: `../x` resolved against the review
 * directory throws out of the containment guard, and an argument from an agent
 * that ends as an exception tells the caller nothing it can act on (P5). The
 * refusal does not echo the value's effect, only its shape requirement.
 *
 * @param projectRoot - Absolute project root, echoed into the payload.
 * @param generationId - The malformed value the caller passed.
 * @returns A payload that compared nothing, naming the shape to pass instead.
 */
export function buildInvalidGenerationPayload(
  projectRoot: string,
  generationId: string,
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
        code: FACTS_GENERATION_ID_INVALID_CODE,
        message: `The generationId ${JSON.stringify(generationId)} is not a review generation identifier, so no generation was read.`,
        affects: ANALYSIS_AXES,
        nextAction: FACTS_GENERATION_ID_INVALID_NEXT_ACTION,
      },
    ],
  };
}
