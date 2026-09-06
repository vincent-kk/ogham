import type { ReviewGroup } from '../state/reviewGroupTypes.js';
import type { ReviewStateRecord } from '../state/reviewStateTypes.js';

/**
 * Allocate fresh IDs beyond the previous generation to reject late callbacks.
 * @param groups New assignments before artifact paths are materialized.
 * @param previous Origin state containing every currently active ID.
 * @returns Fresh IDs, dependencies and their canonical artifact paths.
 */
export function stabilizeReviewGroupIds(
  groups: readonly ReviewGroup[],
  previous: ReviewStateRecord,
): ReviewGroup[] {
  let highest = Math.max(
    0,
    ...previous.groups.map((group) => Number(group.id)),
  );
  if (!Number.isSafeInteger(highest + groups.length))
    throw new Error('review group identifier limit exceeded');
  const ids = new Map(
    groups.map((group) => [group.id, String(++highest).padStart(2, '0')]),
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
