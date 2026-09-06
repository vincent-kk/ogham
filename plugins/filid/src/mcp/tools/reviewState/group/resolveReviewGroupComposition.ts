import type { ReviewGroup } from '../state/reviewGroupTypes.js';
import type { ReviewScopeFile } from '../state/reviewStateTypes.js';

/**
 * Identify assignment composition without display IDs or artifact locations.
 * @param group Current or origin assignment.
 * @param files That generation's roster supplying owner identities.
 * @returns Order-independent exact composition key for unambiguous matching.
 */
export function resolveReviewGroupComposition(
  group: ReviewGroup,
  files: readonly ReviewScopeFile[],
): string {
  return JSON.stringify(
    group.units
      .map((unit) => [
        unit.path,
        unit.change,
        unit.chunk?.index ?? null,
        unit.chunk?.total ?? null,
        files.find((file) => file.path === unit.path)?.owner ?? null,
      ])
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      ),
  );
}
