import { buildChecklist } from './buildChecklist.js';
import { joinDecisions } from './joinDecisions.js';
import type {
  FoldReviewVerdictInput,
  ReviewUnresolvedEvidence,
  ReviewVerdict,
  ReviewVerdictFold,
} from './reviewVerdictTypes.js';

/**
 * Fold trusted review evidence into one deterministic governance verdict.
 *
 * @param input Complete evidence, roster, group, and opinion snapshot.
 * @returns Canonical coverage, decision partitions, unresolved evidence, and verdict.
 */
export function foldReviewVerdict(
  input: FoldReviewVerdictInput,
): ReviewVerdictFold {
  const coverage = buildChecklist(input.files, input.groups);
  const joined = joinDecisions(
    input.groups,
    input.candidates,
    input.evidence.snapshotHash,
  );
  const unresolved: ReviewUnresolvedEvidence[] = [
    ...coverage.unresolved,
    ...joined.unresolved,
  ];
  let hasGap = false;
  let hasIndeterminateVerifier = false;
  let hasUntrustedGroup = false;

  for (const evidence of input.groups) {
    const issues =
      evidence.issues.length > 0
        ? evidence.issues
        : evidence.review === null || evidence.verify === null
          ? (['artifact not validated'] as const)
          : [];
    if (
      issues.length > 0 ||
      evidence.review === null ||
      evidence.verify === null
    )
      hasUntrustedGroup = true;

    for (const detail of issues)
      unresolved.push({
        source: `group ${evidence.group.id}`,
        path: evidence.group.opinionPath,
        rule: 'artifact trust',
        detail,
        affectsVerdict: true,
      });

    for (const gap of evidence.review?.gaps ?? []) {
      hasGap = true;
      unresolved.push({
        source: `review ${evidence.group.id}`,
        path: gap.path,
        rule: gap.rule,
        detail: gap.detail,
        affectsVerdict: true,
      });
    }
    if (evidence.verify?.state === 'INDETERMINATE') {
      hasIndeterminateVerifier = true;
      unresolved.push({
        source: `verification ${evidence.group.id}`,
        path: evidence.group.verifyPath,
        rule: 'verifier state',
        detail: 'verifier opinion is indeterminate',
        affectsVerdict: true,
      });
    }
    for (const observation of evidence.verify?.observations ?? [])
      unresolved.push({
        source: `verification ${evidence.group.id}`,
        path: observation.path,
        rule: 'observation',
        detail: observation.detail,
        affectsVerdict: false,
      });
  }

  for (const information of input.informational)
    unresolved.push({
      source: information.source,
      path: information.path,
      rule: information.rule,
      detail: information.message,
      affectsVerdict: false,
    });

  let verdict: ReviewVerdict;
  if (
    !input.evidence.evidenceComplete ||
    input.evidence.worktree === 'documents-only' ||
    input.evidence.worktree === 'source-dirty' ||
    hasUntrustedGroup
  )
    verdict = 'INCONCLUSIVE';
  else if (
    coverage.checklist.some(({ result }) => result === 'pending') ||
    hasGap ||
    hasIndeterminateVerifier
  )
    verdict = 'INCONCLUSIVE';
  else if (joined.unresolved.some(({ affectsVerdict }) => affectsVerdict))
    verdict = 'INCONCLUSIVE';
  else if (joined.indeterminate.length > 0) verdict = 'INCONCLUSIVE';
  else if (joined.confirmed.length > 0) verdict = 'REQUEST_CHANGES';
  else verdict = 'APPROVED';

  return {
    verdict,
    checklist: coverage.checklist,
    decisions: joined.decisions,
    confirmed: joined.confirmed,
    refuted: joined.refuted,
    indeterminate: joined.indeterminate,
    unresolved,
    filesTotal: coverage.filesTotal,
    filesReviewed: coverage.filesReviewed,
    filesSkipped: coverage.filesSkipped,
  };
}
