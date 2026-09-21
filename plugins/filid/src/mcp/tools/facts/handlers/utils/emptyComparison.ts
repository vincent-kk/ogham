import type { FactsCompareData } from '../../types/factsToolTypes.js';

/**
 * A comparison that found nothing, for the calls that compare nothing.
 * @returns Every bucket empty.
 */
export function emptyComparison(): FactsCompareData {
  return {
    missingInStore: [],
    missingInCandidate: [],
    resolutionDiffers: [],
    informational: [],
    sideTableItems: [],
  };
}
