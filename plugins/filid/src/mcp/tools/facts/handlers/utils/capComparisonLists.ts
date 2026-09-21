import { FACTS_STATUS_LIST_LIMIT } from '../../../../../constants/facts.js';
import type { FactsCompareData } from '../../types/factsToolTypes.js';

/**
 * Bound every list so one comparison cannot fill the response.
 * @param comparison - The full comparison.
 * @returns The same shape with each list cut to the shared limit.
 */
export function capComparisonLists(
  comparison: FactsCompareData,
): FactsCompareData {
  return {
    missingInStore: comparison.missingInStore.slice(0, FACTS_STATUS_LIST_LIMIT),
    missingInCandidate: comparison.missingInCandidate.slice(
      0,
      FACTS_STATUS_LIST_LIMIT,
    ),
    resolutionDiffers: comparison.resolutionDiffers.slice(
      0,
      FACTS_STATUS_LIST_LIMIT,
    ),
    informational: comparison.informational.slice(0, FACTS_STATUS_LIST_LIMIT),
    sideTableItems: comparison.sideTableItems.slice(0, FACTS_STATUS_LIST_LIMIT),
    // Already bounded by `capFileList` where it is built; slicing a capped
    // list again would drop the count that says what was left out.
    ...(comparison.unrecorded === undefined
      ? {}
      : { unrecorded: comparison.unrecorded }),
  };
}
