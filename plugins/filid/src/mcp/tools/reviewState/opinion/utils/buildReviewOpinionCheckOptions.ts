import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type { CheckReviewOpinionOptions } from '../uncheckedOpinionTypes.js';

/**
 * Assemble one group's trust-check options from its already-resolved opinion source hash.
 * @param group Prepared group whose original units and policy anchor the check.
 * @param round One-based review round the opinion claims to satisfy.
 * @param sourceHash Opinion source hash resolved by resolveReviewOpinionSourceHash.
 * @returns Options ready for checkReviewOpinion.
 */
export function buildReviewOpinionCheckOptions(
  group: ReviewGroup,
  round: number,
  sourceHash: string,
): CheckReviewOpinionOptions {
  return {
    group: group.id,
    round,
    sourceHash,
    units: group.opinionUnits ?? group.units,
    policy: group,
  };
}
