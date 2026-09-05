import type { ReviewFinding } from '../opinion/reviewOpinionTypes.js';
import { splitVerifierAssignment } from '../opinion/splitVerifierAssignment.js';
import type { VerifyDecision } from '../opinion/verifyOpinionTypes.js';
import type { ReviewGroup } from '../state/reviewGroupTypes.js';
import type { ReviewScopeCandidate } from '../state/reviewStateTypes.js';

/**
 * Derive canonical candidate confirmations and outside-hunk refutations.
 * @param group Trusted assignment supplying candidate IDs and hunk evidence.
 * @param findings Trusted merged claims whose independent assignment is shared with validation.
 * @param candidates Canonical candidate roster measured on the supplied snapshot.
 * @param snapshotHash Structural snapshot identity named in confirmation reasons.
 * @returns Fresh decisions in candidate-roster then merged-finding order, without I/O.
 */
export function buildDeterministicDecisions(
  group: ReviewGroup,
  findings: readonly ReviewFinding[],
  candidates: readonly ReviewScopeCandidate[],
  snapshotHash: string,
): VerifyDecision[] {
  const confirmed = candidates
    .filter(({ id }) => group.candidateIds.includes(id))
    .map<VerifyDecision>(({ id }) => ({
      findingId: id,
      verdict: 'CONFIRMED',
      evidence: `evidence.md#${id}`,
      reason: `canonical structure evidence measured on snapshot ${snapshotHash}`,
    }));
  const refuted = splitVerifierAssignment(
    findings,
  ).deterministicRefuted.map<VerifyDecision>((finding) => ({
    findingId: finding.id,
    verdict: 'REFUTED',
    evidence: `${finding.path}:${group.units
      .filter(({ path }) => path === finding.path)
      .flatMap(({ hunks }) =>
        hunks.map(({ newStart, newEnd }) => `${newStart}-${newEnd}`),
      )
      .join(', ')}`,
    reason: 'finding lies outside the changed hunks',
  }));
  return [...confirmed, ...refuted];
}
