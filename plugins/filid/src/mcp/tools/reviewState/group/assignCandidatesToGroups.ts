import type { ReviewGroup } from '../state/reviewGroupTypes.js';

import type { AssignCandidatesToGroupsOptions } from './types/buildReviewGroupsTypes.js';

/**
 * Assign every FCA candidate to one creation-ordered review group.
 *
 * @param input Existing groups, roster ownership, and ordered FCA candidates.
 * @returns Cloned groups with every candidate assigned exactly once.
 * @throws When a candidate exists but no target group can be established.
 */
export function assignCandidatesToGroups(
  input: AssignCandidatesToGroupsOptions,
): ReviewGroup[] {
  const { groups, files, candidates } = input;
  if (groups.length === 0 && candidates.length === 0) return [];

  const assigned: ReviewGroup[] =
    groups.length > 0
      ? groups.map((group) => ({
          ...group,
          candidateIds: [...group.candidateIds],
        }))
      : [
          {
            id: '01',
            units: [],
            churn: 0,
            planRequired: false,
            dependsOn: [],
            candidateIds: [],
            briefPath: 'briefs/review-01.md',
            skeletonPath: 'opinions/review-01.r1.json',
            opinionPath: 'opinions/review-01.json',
            verifyBriefPath: 'briefs/verify-01.md',
            verifyPath: 'opinions/verify-01.json',
            rounds: 0,
            validated: { review: null, verify: null },
          },
        ];
  const filesByPath = new Map(files.map((file) => [file.path, file]));

  for (const candidate of candidates) {
    const exact = assigned.find((group) =>
      group.units.some((unit) => unit.path === candidate.path),
    );
    const owner = assigned.find((group) =>
      group.units.some(
        (unit) => filesByPath.get(unit.path)?.owner === candidate.path,
      ),
    );
    const target = exact ?? owner ?? assigned[0];
    if (!target) throw new Error('candidate assignment requires a group');
    target.candidateIds.push(candidate.id);
  }

  return assigned;
}
