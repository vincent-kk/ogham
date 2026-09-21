import { ANALYSIS_AXES } from '../../../../../constants/analysisAxes.js';
import { FACTS_UNFROZEN_GENERATION_CODE, FACTS_UNFROZEN_GENERATION_NEXT_ACTION } from '../../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../../../types/toolEnvelope.js';
import type {
  FactsCompareData,
  FactsCompareSummary,
} from '../../types/factsToolTypes.js';

import { emptyComparison } from './emptyComparison.js';

/**
 * Answer a comparison asked against a generation whose facts are not frozen.
 *
 * Freezing facts into a review generation is a later stage. Comparing against
 * the live store and calling it the generation's would be a guess about which
 * facts that review actually saw, and a wrong one would make a sealed review
 * unreproducible — so the call says plainly that no frozen facts exist rather
 * than answering from the wrong source.
 *
 * @param projectRoot - Absolute project root, echoed into the payload.
 * @param generationId - The generation the caller named.
 * @returns A payload that compared nothing, naming what to call instead.
 */
export function buildUnfrozenGenerationPayload(
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
        code: FACTS_UNFROZEN_GENERATION_CODE,
        message: `No facts are frozen for generation ${generationId}.`,
        affects: ANALYSIS_AXES,
        nextAction: FACTS_UNFROZEN_GENERATION_NEXT_ACTION,
      },
    ],
  };
}
