import type { ReviewBlocker } from '../../verdict/reviewVerdictTypes.js';

/** Human decisions are surfaced before unclassified work and routine evidence recovery. */
const ATTENTION_ORDER = {
  'human-decision': 0,
  triage: 1,
  'evidence-recovery': 2,
} as const;

/**
 * Order existing IDs for attention without reassigning identities or mutating the fold.
 * @param blockers Complete blocker model shared by every rendered artifact.
 * @returns Attention-first order with deterministic review-local ID tie breaking.
 */
export function sortReviewBlockers(
  blockers: readonly ReviewBlocker[],
): ReviewBlocker[] {
  return [...blockers].sort(
    (left, right) =>
      ATTENTION_ORDER[left.attention] - ATTENTION_ORDER[right.attention] ||
      Number(left.id.slice(4)) - Number(right.id.slice(4)),
  );
}
