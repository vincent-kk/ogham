import { portableBasename } from '@ogham/cross-platform';

import type { ReviewGroup } from './reviewGroupTypes.js';

/**
 * Check that persisted group artifacts use the paths derived from the group ID.
 *
 * @param group Persisted review group whose paths cross the filesystem boundary.
 * @returns True only when every group and unit artifact path is canonical.
 */
export function hasCanonicalReviewGroupPaths(group: ReviewGroup): boolean {
  const id = group.id;
  if (group.briefPath !== `briefs/review-${id}.md`) return false;
  if (group.skeletonPath !== `opinions/review-${id}.r1.json`) return false;
  if (group.opinionPath !== `opinions/review-${id}.json`) return false;
  if (group.verifyBriefPath !== `briefs/verify-${id}.md`) return false;
  if (group.verifyPath !== `opinions/verify-${id}.json`) return false;
  return group.units.every((unit, index) => {
    const chunkSuffix = unit.chunk
      ? `.${unit.chunk.index}-of-${unit.chunk.total}`
      : '';
    const fileName = `${String(index + 1).padStart(2, '0')}-${portableBasename(unit.path)}${chunkSuffix}.diff`;
    return unit.diffPath === `diffs/${id}/${fileName}`;
  });
}
