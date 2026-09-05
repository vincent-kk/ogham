import type { ReviewGroup } from '../../state/reviewGroupTypes.js';

import { retainReviewGroupValidations } from './retainReviewGroupValidations.js';

/**
 * Apply a new reviewer round budget without changing stable group identity.
 * @param groups Prepared groups whose opinions and validations must survive.
 * @param rounds New positive round budget for reviewable groups.
 * @returns Copied groups with candidate-only rounds preserved at zero.
 */
export function retuneReviewGroups(
  groups: readonly ReviewGroup[],
  rounds: number,
): ReviewGroup[] {
  const retuned = groups.map((group) => ({
    ...group,
    rounds: group.rounds === 0 ? 0 : rounds,
  }));
  return retainReviewGroupValidations(retuned, groups);
}
