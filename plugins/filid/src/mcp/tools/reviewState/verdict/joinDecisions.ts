import type { ReviewScopeCandidate } from '../state/reviewStateTypes.js';

import type {
  JoinedReviewDecision,
  ReviewDecisionJoinResult,
  SealGroupEvidence,
} from './reviewVerdictTypes.js';

/**
 * Join trusted reviewer findings and every FCA candidate to verifier decisions.
 *
 * @param groups Prepared groups with trusted reviewer and verifier artifacts.
 * @param candidates Complete FCA candidate roster in evidence order.
 * @returns Deterministically joined and partitioned decisions without omissions.
 */
export function joinDecisions(
  groups: readonly SealGroupEvidence[],
  candidates: readonly ReviewScopeCandidate[],
): ReviewDecisionJoinResult {
  const decisions: JoinedReviewDecision[] = [];
  const unresolved: ReviewDecisionJoinResult['unresolved'] = [];
  const joinedCandidateIds = new Set<string>();

  for (const evidence of groups) {
    const review = evidence.issues.length === 0 ? evidence.review : null;
    const verify = evidence.issues.length === 0 ? evidence.verify : null;
    for (const finding of review?.findings ?? []) {
      const decision = verify?.decisions.find(
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
      const decision = verify?.decisions.find(
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
