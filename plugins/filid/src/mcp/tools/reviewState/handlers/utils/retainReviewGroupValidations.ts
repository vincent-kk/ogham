import type { ReviewGroup } from '../../state/reviewGroupTypes.js';

import { resolveReviewGroupIdentity } from './resolveReviewGroupIdentity.js';

/**
 * Retain validation handoffs only when a recomputed group keeps its identity.
 * @param groups Newly recomputed groups awaiting persisted validation state.
 * @param previousGroups Groups restored from the prior prepared state.
 * @returns New groups with only identity-safe validation records restored.
 */
export function retainReviewGroupValidations(
  groups: readonly ReviewGroup[],
  previousGroups: readonly ReviewGroup[],
): ReviewGroup[] {
  const previousByIdentity = new Map(
    previousGroups.map((group) => [resolveReviewGroupIdentity(group), group]),
  );
  return groups.map((group) => {
    const previous = previousByIdentity.get(resolveReviewGroupIdentity(group));
    const validated = previous?.validated;
    return {
      ...group,
      ...(previous
        ? {
            riskReasons: previous.riskReasons,
            planRequired: previous.planRequired,
          }
        : {}),
      validated: validated
        ? {
            review: validated.review
              ? {
                  ...validated.review,
                }
              : null,
            verify: validated.verify ? { ...validated.verify } : null,
          }
        : { review: null, verify: null },
    };
  });
}
