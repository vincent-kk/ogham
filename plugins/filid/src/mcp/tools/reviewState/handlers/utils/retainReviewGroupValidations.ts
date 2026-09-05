import type { ReviewGroup } from '../../state/reviewGroupTypes.js';

/**
 * Return the stable group identity that validation hashes may follow.
 *
 * @param group Review group whose mutable validation and diff paths are ignored.
 * @returns Deterministic JSON identity for safe validation retention.
 */
function groupIdentity(group: ReviewGroup): string {
  const { rounds: _rounds, validated: _validated, units, ...identity } = group;
  return JSON.stringify({
    ...identity,
    units: units.map(({ diffPath: _diffPath, ...unit }) => unit),
  });
}

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
    previousGroups.map((group) => [groupIdentity(group), group.validated]),
  );
  return groups.map((group) => {
    const validated = previousByIdentity.get(groupIdentity(group));
    return {
      ...group,
      validated: validated
        ? {
            review: validated.review
              ? {
                  ...validated.review,
                  complete:
                    validated.review.complete &&
                    validated.review.round >= group.rounds,
                }
              : null,
            verify: validated.verify ? { ...validated.verify } : null,
          }
        : { review: null, verify: null },
    };
  });
}
