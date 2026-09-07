import type { ReviewFinding } from './reviewOpinionTypes.js';
import { splitVerifierAssignment } from './splitVerifierAssignment.js';

/**
 * Split verifier assignment while keeping unresolved prior findings permanently assigned.
 * @param findings Located findings whose inDiff and rule facts were validated.
 * @param priorFindings Unresolved earlier findings already confirmed as assigned.
 * @returns Assignment where every prior finding stays assigned and never reaches deterministicRefuted.
 */
export function mergeVerifierAssignment(
  findings: readonly ReviewFinding[],
  priorFindings: readonly ReviewFinding[] | undefined,
): {
  assigned: ReviewFinding[];
  deterministicRefuted: ReviewFinding[];
} {
  const prior = priorFindings ?? [];
  const priorIds = new Set(prior.map((finding) => finding.id));
  const { assigned, deterministicRefuted } = splitVerifierAssignment(
    findings.filter((finding) => !priorIds.has(finding.id)),
  );
  return { assigned: [...assigned, ...prior], deterministicRefuted };
}
