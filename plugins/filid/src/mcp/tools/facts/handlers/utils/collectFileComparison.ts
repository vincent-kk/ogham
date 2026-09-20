import type { compareReferences } from '../../../../../core/facts/index.js';
import type { FactsCompareData } from '../../types/factsToolTypes.js';

/**
 * Fold one file's comparison into the response buckets.
 *
 * Mutates `into`: the caller owns the accumulator and folds every compared
 * file into the same one.
 *
 * @param into - Accumulating comparison data.
 * @param path - File the references belong to.
 * @param result - That file's comparison.
 */
export function collectFileComparison(
  into: FactsCompareData,
  path: string,
  result: ReturnType<typeof compareReferences>,
): void {
  for (const bucket of [
    'missingInStore',
    'missingInCandidate',
    'resolutionDiffers',
    'informational',
  ] as const)
    for (const one of result[bucket]) into[bucket].push({ path, ...one });
}
