import type { ReviewGroup } from '../state/reviewGroupTypes.js';
import type {
  ReviewScopeFile,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';

import { resolveReviewGroupComposition } from './resolveReviewGroupComposition.js';

/**
 * Retain unambiguous origin IDs without changing group partitioning.
 * @param groups Fresh groups before materializing artifact paths.
 * @param files Current roster and owners.
 * @param previous Origin state, including removed IDs.
 * @returns Groups with stable IDs and rewritten dependencies and paths.
 */
export function stabilizeReviewGroupIds(
  groups: readonly ReviewGroup[],
  files: readonly ReviewScopeFile[],
  previous: ReviewStateRecord,
): ReviewGroup[] {
  const keys = groups.map((group) =>
    resolveReviewGroupComposition(group, files),
  );
  const oldKeys = previous.groups.map((group) =>
    resolveReviewGroupComposition(group, previous.scope.files),
  );
  let highest = Math.max(
    0,
    ...previous.groups.map((group) => Number(group.id)),
  );
  if (!Number.isSafeInteger(highest + groups.length))
    throw new Error('review group identifier limit exceeded');
  const ids = new Map(
    groups.map((group, index) => {
      const matches = oldKeys.flatMap((key, oldIndex) =>
        key === keys[index] ? [previous.groups[oldIndex].id] : [],
      );
      const unique =
        matches.length === 1 &&
        keys.filter((key) => key === keys[index]).length === 1;
      return [
        group.id,
        unique ? matches[0] : String(++highest).padStart(2, '0'),
      ];
    }),
  );
  return groups.map((group) => {
    const id = ids.get(group.id)!;
    return {
      ...group,
      id,
      dependsOn: group.dependsOn.map((dependency) => ids.get(dependency)!),
      briefPath: `briefs/review-${id}.md`,
      skeletonPath: `opinions/review-${id}.r1.json`,
      opinionPath: `opinions/review-${id}.json`,
      verifyBriefPath: `briefs/verify-${id}.md`,
      verifyPath: `opinions/verify-${id}.json`,
    };
  });
}
