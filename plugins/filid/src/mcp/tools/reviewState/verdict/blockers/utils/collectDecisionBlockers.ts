import type {
  FoldReviewVerdictInput,
  ReviewBlockerCause,
  ReviewBlockerSource,
  ReviewDecisionJoinResult,
} from '../../reviewVerdictTypes.js';

/**
 * Preserve indeterminate decisions and typed set mismatches without duplicate missing-decision cards.
 * @param input Trusted group artifacts and the canonical candidate roster.
 * @param joined Existing decision partitions and exact expected/observed identity sets.
 * @returns Decision causes whose references retain every missing or conflicting source.
 */
export function collectDecisionBlockers(
  input: FoldReviewVerdictInput,
  joined: ReviewDecisionJoinResult,
): ReviewBlockerCause[] {
  const causes: ReviewBlockerCause[] = [];
  for (const decision of joined.indeterminate) {
    const matchingGroups = input.groups.filter(({ group, review }) =>
      decision.origin === 'fca'
        ? group.candidateIds.includes(decision.id)
        : review?.findings.some(({ id }) => id === decision.id),
    );
    const groups = matchingGroups.filter(
      ({ issues, review, verify }) =>
        issues.length === 0 && review !== null && verify !== null,
    );
    if (matchingGroups.length > 0 && groups.length === 0) continue;
    const sources: ReviewBlockerSource[] =
      decision.origin === 'fca'
        ? [
            {
              artifactPath: 'review-state.json',
              pointer: `/scope/candidates/${input.candidates.findIndex(({ id }) => id === decision.id)}`,
            },
          ]
        : [];
    for (const { group, review } of groups) {
      sources.push({ artifactPath: group.verifyPath, pointer: '/decisions' });
      if (decision.origin === 'review')
        sources.push({
          artifactPath: group.opinionPath,
          pointer: `/findings/${review!.findings.findIndex(({ id }) => id === decision.id)}`,
        });
    }
    const proposals = groups.flatMap(({ group, verify, issues }) =>
      issues.length === 0
        ? (verify?.decisions ?? []).flatMap((value, index) =>
            value.findingId === decision.id &&
            value.verdict === 'INDETERMINATE' &&
            value.resolution
              ? [
                  {
                    resolution: value.resolution,
                    source: {
                      artifactPath: group.verifyPath,
                      pointer: `/decisions/${index}`,
                    },
                  },
                ]
              : [],
          )
        : [],
    );
    const base: ReviewBlockerCause = {
      kind: 'decision-indeterminate',
      scope: {
        path: decision.path,
        groupId: groups.length === 1 ? groups[0]!.group.id : null,
        findingId: decision.id,
        rule: decision.rule,
      },
      detail: decision.decisionReason,
      sources,
      adviceSource: 'deterministic',
      resolution: {
        question: `Can finding ${decision.id} be independently confirmed or refuted?`,
        evidenceNeeded: [
          'A conclusive disposition and its concrete evidence for the assigned finding',
        ],
        nextAction:
          'Obtain the missing decision evidence and validate the exact assigned decision set within the existing review workflow.',
        doneWhen:
          'Validated evidence supports CONFIRMED or REFUTED for this finding in a new review.',
        suggestedOwner: 'agent',
      },
    };
    if (proposals.length === 0) causes.push(base);
    else
      for (const proposal of proposals)
        causes.push({
          ...base,
          resolution: proposal.resolution,
          adviceSource: 'actor',
          sources: [...sources, proposal.source],
        });
  }
  for (const issue of joined.coverageIssues)
    for (const id of new Set([...issue.expectedIds, ...issue.actualIds])) {
      const expected = issue.expectedIds.filter((value) => value === id).length;
      const actual = issue.actualIds.filter((value) => value === id).length;
      if (expected === actual && expected <= 1) continue;
      const source: ReviewBlockerSource =
        issue.groupId === null
          ? { artifactPath: 'review-state.json', pointer: '/scope/candidates' }
          : { artifactPath: issue.artifactPath, pointer: '/decisions' };
      const missing = causes.filter(
        (cause) =>
          cause.kind === 'decision-indeterminate' &&
          cause.scope.findingId === id,
      );
      if (actual < expected && expected === 1 && missing.length > 0) {
        for (const cause of missing) cause.sources.push(source);
        continue;
      }
      causes.push({
        kind: 'decision-coverage',
        scope: {
          path: null,
          groupId: issue.groupId,
          findingId: id,
          rule: 'decision coverage',
        },
        detail: `Decision ${id}: expected ${expected}, observed ${actual}; each required identity must occur exactly once.`,
        sources: [source],
        adviceSource: 'deterministic',
        resolution: {
          question: `Does decision ${id} match its exact assignment?`,
          evidenceNeeded: [
            'The required identity set and the complete independent and deterministic decision set',
          ],
          nextAction:
            'Compare the recorded assignment with decision identities and recover valid evidence without dropping required findings.',
          doneWhen:
            'Every required identity has exactly one valid decision and no unassigned decision remains.',
          suggestedOwner: 'agent',
        },
      });
    }

  return causes;
}
