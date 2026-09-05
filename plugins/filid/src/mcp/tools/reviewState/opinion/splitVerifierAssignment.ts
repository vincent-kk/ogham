import type { ReviewFinding } from './reviewOpinionTypes.js';

/**
 * Separate independent verifier claims from deterministic outside-diff refutations.
 * @param findings Located findings whose inDiff and rule facts were validated.
 * @returns Stable, disjoint partitions preserving finding identity and order.
 */
export function splitVerifierAssignment(findings: readonly ReviewFinding[]): {
  assigned: ReviewFinding[];
  deterministicRefuted: ReviewFinding[];
} {
  const assigned: ReviewFinding[] = [];
  const deterministicRefuted: ReviewFinding[] = [];
  for (const finding of findings) {
    const outside =
      finding.inDiff === false &&
      !finding.rule.startsWith('USR-') &&
      !finding.rule.startsWith('FCA-');
    (outside ? deterministicRefuted : assigned).push(finding);
  }
  return { assigned, deterministicRefuted };
}
