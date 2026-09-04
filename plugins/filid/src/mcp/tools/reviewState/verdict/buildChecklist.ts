import type { ReviewScopeFile } from '../state/reviewStateTypes.js';

import type {
  ReviewChecklistResult,
  SealGroupEvidence,
} from './reviewVerdictTypes.js';

/**
 * Project trusted reviewer unit results onto every prepare-time roster row.
 *
 * @param files Complete changed-file roster in prepare order.
 * @param groups Prepared groups with only trusted opinion artifacts attached.
 * @returns Checklist rows, coverage counts, and reviewer skip evidence.
 */
export function buildChecklist(
  files: readonly ReviewScopeFile[],
  groups: readonly SealGroupEvidence[],
): ReviewChecklistResult {
  const checklist: ReviewChecklistResult['checklist'] = [];
  const unresolved: ReviewChecklistResult['unresolved'] = [];

  for (const file of files) {
    const assigned = groups.flatMap((evidence) =>
      evidence.group.units
        .filter((unit) => unit.path === file.path)
        .map((unit) => ({ evidence, unit })),
    );
    const groupIds = groups
      .filter(({ group }) =>
        group.units.some((unit) => unit.path === file.path),
      )
      .map(({ group }) => group.id);

    if (file.skipReason !== null) {
      checklist.push({
        path: file.path,
        change: file.change,
        groups: groupIds,
        result: 'skipped',
        reason: file.skipReason,
      });
      continue;
    }

    let coverageMissing = assigned.length === 0;
    let pendingReason = coverageMissing ? 'review unit missing' : '';
    const reviewerSkipReasons: string[] = [];

    for (const { evidence, unit } of assigned) {
      const review = evidence.issues.length === 0 ? evidence.review : null;
      const chunk = unit.chunk
        ? `${unit.chunk.index}/${unit.chunk.total}`
        : null;
      const result = review?.files.find(
        (entry) => entry.path === unit.path && entry.chunk === chunk,
      );
      if (!result) {
        coverageMissing = true;
        pendingReason ||= review
          ? 'review result missing'
          : 'review opinion missing';
        continue;
      }
      if (result.result === 'skipped') {
        const detail = `reviewer skipped: ${result.reason ?? 'reason unavailable'}`;
        reviewerSkipReasons.push(detail);
        unresolved.push({
          source: `review ${evidence.group.id}`,
          path: file.path,
          rule: 'review coverage',
          detail,
          affectsVerdict: true,
        });
      }
    }

    const reason = reviewerSkipReasons[0] ?? pendingReason;
    checklist.push({
      path: file.path,
      change: file.change,
      groups: groupIds,
      result:
        reviewerSkipReasons.length > 0 || coverageMissing
          ? 'pending'
          : 'reviewed',
      reason,
    });
  }

  return {
    checklist,
    unresolved,
    filesTotal: checklist.length,
    filesReviewed: checklist.filter(({ result }) => result === 'reviewed')
      .length,
    filesSkipped: checklist.filter(({ result }) => result === 'skipped').length,
  };
}
