import type {
  FoldReviewVerdictInput,
  ReviewBlockerCause,
  ReviewChecklistResult,
} from '../../reviewVerdictTypes.js';

/**
 * Keep every pending path and its assigned chunks visible as a review obligation.
 * @param input Prepared roster and trusted reviewer evidence.
 * @param coverage Path-level checklist already used by the verdict fold.
 * @returns Pending-path causes without promoting actor skips into exclusions.
 */
export function collectCoverageBlockers(
  input: FoldReviewVerdictInput,
  coverage: ReviewChecklistResult,
): ReviewBlockerCause[] {
  return coverage.checklist.flatMap((entry, index): ReviewBlockerCause[] => {
    if (entry.result !== 'pending') return [];
    const groups = input.groups.filter(({ group }) =>
      entry.groups.includes(group.id),
    );
    const hasIndependentCoverageGap = groups.some(
      ({ group, review, issues }) =>
        issues.length === 0 &&
        review !== null &&
        group.units
          .filter((unit) => unit.path === entry.path)
          .some((unit) => {
            const chunk = unit.chunk
              ? `${unit.chunk.index}/${unit.chunk.total}`
              : null;
            const result = review.files.find(
              (file) => file.path === unit.path && file.chunk === chunk,
            );
            return !result || result.result === 'skipped';
          }),
    );
    if (groups.length > 0 && !hasIndependentCoverageGap) return [];
    const chunks = groups.flatMap(({ group }) =>
      group.units
        .filter((unit) => unit.path === entry.path)
        .map((unit) =>
          unit.chunk ? `${unit.chunk.index}/${unit.chunk.total}` : 'unchunked',
        ),
    );
    return [
      {
        kind: 'coverage-pending',
        scope: {
          path: entry.path,
          groupId: entry.groups.length === 1 ? entry.groups[0]! : null,
          findingId: null,
          rule: 'review coverage',
        },
        detail: entry.reason,
        sources: [
          {
            artifactPath: 'review-state.json',
            pointer: `/scope/files/${index}`,
          },
          ...groups.map(({ group }) => ({
            artifactPath: group.opinionPath,
            pointer: '/files',
          })),
        ],
        adviceSource: 'deterministic',
        resolution: {
          question: 'Is every assigned unit of this path reviewed?',
          evidenceNeeded: [
            `Complete assigned reviewer results${chunks.length ? ` for chunks ${chunks.join(', ')}` : '; no assigned unit is recorded'}`,
          ],
          nextAction:
            'Inspect the missing or skipped unit evidence and complete its assigned review within the existing handoff and retry limits.',
          doneWhen:
            'Validated results cover every assigned chunk of this path; a skip reason alone does not satisfy review coverage.',
          suggestedOwner: 'agent',
        },
      },
    ];
  });
}
