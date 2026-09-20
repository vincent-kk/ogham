import type {
  ReviewGenerationReplacement,
  ReviewStateRecord,
} from './reviewStateTypes.js';

/** Anything that may carry an earlier replacement: a read state, or bytes parsed from an archive. */
type ReplacementCarrier = Pick<ReviewStateRecord, 'replacedFrom'>;

/** How many earlier replacements a record carries before it counts the rest. */
const CHAIN_LIMIT = 8;

/**
 * Keep a chain of re-runs readable: A replaced by B replaced by C still names A.
 *
 * Only the prior record knows what it replaced, so each new replacement takes
 * the prior chain, puts the prior replacement in front of it and cuts the tail
 * to a bound, counting what it dropped.
 *
 * @param replacement Replacement the new generation records.
 * @param previous Generation being replaced, or null when none could be read.
 * @returns The replacement with its chain and, when cut, the number left out.
 */
export function linkReplacementChain(
  replacement: ReviewGenerationReplacement,
  previous: ReplacementCarrier | null,
): ReviewGenerationReplacement {
  const earlier = previous?.replacedFrom;
  if (!earlier) return replacement;
  const chain = [
    {
      reason: earlier.reason,
      ...(earlier.priorGenerationId
        ? { priorGenerationId: earlier.priorGenerationId }
        : {}),
      ...(earlier.priorVerdict ? { priorVerdict: earlier.priorVerdict } : {}),
    },
    ...(earlier.chain ?? []),
  ];
  const dropped = Math.max(0, chain.length - CHAIN_LIMIT);
  return {
    ...replacement,
    chain: chain.slice(0, CHAIN_LIMIT),
    ...(dropped + (earlier.olderCount ?? 0) > 0
      ? { olderCount: dropped + (earlier.olderCount ?? 0) }
      : {}),
  };
}
