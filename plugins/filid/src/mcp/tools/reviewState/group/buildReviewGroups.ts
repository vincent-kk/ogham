import {
  REVIEW_SMALL_GROUP_CHURN_LIMIT,
  REVIEW_SMALL_GROUP_FILE_LIMIT,
} from '../../../../constants/reviewState.js';
import type { ReviewGroup, ReviewUnit } from '../state/reviewGroupTypes.js';

import { assignCandidatesToGroups } from './assignCandidatesToGroups.js';
import type { BuildReviewGroupsOptions } from './types/buildReviewGroupsTypes.js';

/**
 * Format a zero-based creation index as a one-based group identifier.
 *
 * @param index Zero-based group creation index.
 * @returns Numeric identifier padded to at least two digits.
 */
function formatGroupId(index: number): string {
  return String(index + 1).padStart(2, '0');
}

/**
 * Build bounded review groups in deterministic numeric creation order.
 *
 * @param input Units, roster, candidates, round budget, and configured caps.
 * @returns Creation-ordered groups with dependencies and candidate ownership.
 * @throws When a cap is invalid or a unit is unowned or exceeds group churn.
 */
export function buildReviewGroups(
  input: BuildReviewGroupsOptions,
): ReviewGroup[] {
  const {
    units,
    files,
    candidates,
    rounds,
    groupFileLimit,
    groupChurnLimit,
    planChurnLimit,
  } = input;
  if (!Number.isInteger(groupFileLimit) || groupFileLimit <= 0)
    throw new Error('group file limit must be a positive integer');

  if (!Number.isInteger(groupChurnLimit) || groupChurnLimit <= 0)
    throw new Error('group churn limit must be a positive integer');

  if (!Number.isInteger(planChurnLimit) || planChurnLimit <= 0)
    throw new Error('plan churn limit must be a positive integer');

  if (!Number.isInteger(rounds) || rounds < 0)
    throw new Error('review rounds must be a nonnegative integer');

  const filesByPath = new Map(files.map((file) => [file.path, file]));
  for (const unit of units) {
    if (!filesByPath.has(unit.path))
      throw new Error(`review unit has no scoped file: ${unit.path}`);

    if (unit.churn > groupChurnLimit)
      throw new Error(`review unit exceeds churn limit: ${unit.path}`);
  }

  const sorted = [...units].sort((left, right) => {
    const leftOwner = filesByPath.get(left.path)?.owner ?? null;
    const rightOwner = filesByPath.get(right.path)?.owner ?? null;
    if (leftOwner === null && rightOwner !== null) return 1;
    if (leftOwner !== null && rightOwner === null) return -1;
    if (leftOwner !== rightOwner) return leftOwner! < rightOwner! ? -1 : 1;
    if (left.path !== right.path) return left.path < right.path ? -1 : 1;
    return (left.chunk?.index ?? 0) - (right.chunk?.index ?? 0);
  });

  const ownerBuckets = new Map<string | null, Map<string, ReviewUnit[]>>();
  for (const unit of sorted) {
    const owner = filesByPath.get(unit.path)?.owner ?? null;
    const basename = unit.path.slice(unit.path.lastIndexOf('/') + 1);
    const extensionIndex = basename.lastIndexOf('.');
    let stem =
      extensionIndex > 0 ? basename.slice(0, extensionIndex) : basename;
    let previousStem = '';
    while (stem !== previousStem) {
      previousStem = stem;
      stem = stem.replace(/\.(?:spec|test|stories)$/i, '');
      stem = stem.replace(/\.[a-z]{2,3}(?:[-_][a-z]{2})?$/i, '');
    }
    const stems = ownerBuckets.get(owner) ?? new Map<string, ReviewUnit[]>();
    const related = stems.get(stem) ?? [];
    related.push(unit);
    stems.set(stem, related);
    ownerBuckets.set(owner, stems);
  }
  const ordered = [...ownerBuckets.values()].flatMap((stems) =>
    [...stems.values()].flat(),
  );

  const unitGroups: ReviewUnit[][] = [];
  const totalChurn = ordered.reduce((total, unit) => total + unit.churn, 0);
  const useSmallGroup =
    ordered.length > 0 &&
    ordered.length <= Math.min(REVIEW_SMALL_GROUP_FILE_LIMIT, groupFileLimit) &&
    totalChurn <= Math.min(REVIEW_SMALL_GROUP_CHURN_LIMIT, groupChurnLimit);
  if (useSmallGroup) unitGroups.push(ordered);
  else {
    let current: ReviewUnit[] = [];
    let currentChurn = 0;
    for (const unit of ordered) {
      if (unit.chunk) {
        if (current.length > 0) unitGroups.push(current);
        unitGroups.push([unit]);
        current = [];
        currentChurn = 0;
        continue;
      }
      if (
        current.length > 0 &&
        (current.length + 1 > groupFileLimit ||
          currentChurn + unit.churn > groupChurnLimit)
      ) {
        unitGroups.push(current);
        current = [];
        currentChurn = 0;
      }
      current.push(unit);
      currentChurn += unit.churn;
    }
    if (current.length > 0) unitGroups.push(current);
  }

  const groups: ReviewGroup[] = unitGroups.map((groupUnits, index) => ({
    id: formatGroupId(index),
    units: [...groupUnits],
    churn: groupUnits.reduce((total, unit) => total + unit.churn, 0),
    planRequired: groupUnits.some((unit) => {
      const file = filesByPath.get(unit.path);
      return Boolean(file && file.insertions + file.deletions > planChurnLimit);
    }),
    dependsOn: [],
    candidateIds: [],
    briefPath: `briefs/review-${formatGroupId(index)}.md`,
    skeletonPath: `opinions/review-${formatGroupId(index)}.r1.json`,
    opinionPath: `opinions/review-${formatGroupId(index)}.json`,
    verifyBriefPath: `briefs/verify-${formatGroupId(index)}.md`,
    verifyPath: `opinions/verify-${formatGroupId(index)}.json`,
    rounds,
    validated: { review: null, verify: null },
  }));

  const priorChunkGroup = new Map<string, string>();
  for (const group of groups) {
    const chunk = group.units.length === 1 ? group.units[0] : undefined;
    if (!chunk?.chunk) continue;
    const prior = priorChunkGroup.get(chunk.path);
    if (prior) group.dependsOn = [prior];
    priorChunkGroup.set(chunk.path, group.id);
  }

  return assignCandidatesToGroups({ groups, files, candidates });
}
