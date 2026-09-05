import { REVIEW_DECISION_COVERAGE_MISMATCH } from '../../../../constants/reviewState.js';
import type { ReviewScopeCandidate } from '../state/reviewStateTypes.js';

import { buildDeterministicDecisions } from './buildDeterministicDecisions.js';
import type {
  JoinedReviewDecision,
  ReviewDecisionJoinResult,
  SealGroupEvidence,
} from './reviewVerdictTypes.js';
import { hasExactDecisionCoverage } from './utils/hasExactDecisionCoverage.js';

/**
 * Join trusted independent and canonical decisions with exact assignment coverage.
 *
 * @param groups Prepared groups with trusted reviewer and verifier artifacts.
 * @param candidates Complete FCA candidate roster in evidence order.
 * @param snapshotHash Identity of the structural evidence confirming FCA candidates.
 * @returns Deterministically joined and partitioned decisions without omissions.
 */
export function joinDecisions(
  groups: readonly SealGroupEvidence[],
  candidates: readonly ReviewScopeCandidate[],
  snapshotHash: string,
): ReviewDecisionJoinResult {
  const decisions: JoinedReviewDecision[] = [];
  const unresolved: ReviewDecisionJoinResult['unresolved'] = [];
  const joinedCandidateIds = new Set<string>();
  const expectedIds = candidates.map(({ id }) => id);
  const decisionIds: string[] = [];

  for (const evidence of groups) {
    const review = evidence.issues.length === 0 ? evidence.review : null;
    const verify = evidence.issues.length === 0 ? evidence.verify : null;
    const deterministic =
      review !== null && verify !== null
        ? buildDeterministicDecisions(
            evidence.group,
            review.findings,
            candidates,
            snapshotHash,
          )
        : [];
    const combined = [...deterministic, ...(verify?.decisions ?? [])];
    const findingIds = (review?.findings ?? []).map(({ id }) => id);
    expectedIds.push(...findingIds);
    decisionIds.push(...combined.map(({ findingId }) => findingId));
    if (
      evidence.issues.length === 0 &&
      !hasExactDecisionCoverage(
        [...evidence.group.candidateIds, ...findingIds],
        combined.map(({ findingId }) => findingId),
      )
    )
      unresolved.push({
        source: `verification ${evidence.group.id}`,
        path: evidence.group.verifyPath,
        rule: 'decision coverage',
        detail: REVIEW_DECISION_COVERAGE_MISMATCH,
        affectsVerdict: true,
      });
    for (const finding of review?.findings ?? []) {
      const decision = combined.find(
        ({ findingId }) => findingId === finding.id,
      );
      decisions.push({
        id: finding.id,
        origin: 'review',
        severity: finding.severity,
        category: finding.category,
        path: finding.path,
        lines: finding.lines,
        rule: finding.rule,
        message: finding.message,
        verdict: decision?.verdict ?? 'INDETERMINATE',
        decisionEvidence: decision?.evidence ?? '',
        decisionReason: decision?.reason ?? 'missing decision',
        findingEvidence: finding.evidence,
        consequence: finding.consequence,
        recommendedAction: finding.recommendedAction,
      });
      if (!decision)
        unresolved.push({
          source: `verification ${evidence.group.id}`,
          path: finding.path,
          rule: finding.rule,
          detail: 'missing decision',
          affectsVerdict: true,
        });
    }

    for (const candidate of candidates) {
      if (!evidence.group.candidateIds.includes(candidate.id)) continue;
      joinedCandidateIds.add(candidate.id);
      const decision = combined.find(
        ({ findingId }) => findingId === candidate.id,
      );
      decisions.push({
        id: candidate.id,
        origin: 'fca',
        severity: candidate.severity,
        category: candidate.category,
        path: candidate.path,
        lines: 'unknown',
        rule: candidate.rule,
        message: candidate.message,
        verdict: decision?.verdict ?? 'INDETERMINATE',
        decisionEvidence: decision?.evidence ?? '',
        decisionReason: decision?.reason ?? 'missing decision',
        findingEvidence: null,
        consequence: null,
        recommendedAction: null,
      });
      if (!decision)
        unresolved.push({
          source: `verification ${evidence.group.id}`,
          path: candidate.path,
          rule: candidate.rule,
          detail: 'missing decision',
          affectsVerdict: true,
        });
    }
  }

  for (const candidate of candidates) {
    if (joinedCandidateIds.has(candidate.id)) continue;
    decisions.push({
      id: candidate.id,
      origin: 'fca',
      severity: candidate.severity,
      category: candidate.category,
      path: candidate.path,
      lines: 'unknown',
      rule: candidate.rule,
      message: candidate.message,
      verdict: 'INDETERMINATE',
      decisionEvidence: '',
      decisionReason: 'missing decision',
      findingEvidence: null,
      consequence: null,
      recommendedAction: null,
    });
    unresolved.push({
      source: 'verification',
      path: candidate.path,
      rule: candidate.rule,
      detail: 'missing decision',
      affectsVerdict: true,
    });
  }

  if (
    groups.every((evidence) => evidence.issues.length === 0) &&
    !hasExactDecisionCoverage(expectedIds, decisionIds)
  )
    unresolved.push({
      source: 'verification',
      path: 'evidence.md',
      rule: 'decision coverage',
      detail: REVIEW_DECISION_COVERAGE_MISMATCH,
      affectsVerdict: true,
    });
  return {
    decisions,
    confirmed: decisions.filter(({ verdict }) => verdict === 'CONFIRMED'),
    refuted: decisions.filter(({ verdict }) => verdict === 'REFUTED'),
    indeterminate: decisions.filter(
      ({ verdict }) => verdict === 'INDETERMINATE',
    ),
    unresolved,
  };
}
