import { isReviewInputManifestValid } from '../hash/isReviewInputManifestValid.js';
import type {
  ReviewInputManifest,
  ReviewReuseReason,
} from '../state/reviewIncrementalTypes.js';

/** Each changed input retains its own reason in the decision artifact. */
const INPUT_REASONS = [
  ['sourceHash', 'source-input-changed'],
  ['rulesHash', 'rules-changed'],
  ['evidenceHash', 'evidence-changed'],
  ['contextHash', 'context-changed'],
  ['policyHash', 'policy-incompatible'],
  ['groupKey', 'composition-changed'],
] as const;

/**
 * Compare one file's explicit inputs and its original artifact trust.
 * @param current Current committed file inputs.
 * @param previous Previous file inputs, absent for an incompatible legacy record.
 * @param trusted Whether the original review and verification completed intact.
 * @returns Every reason that prevents file result reuse.
 */
export function resolveReviewReuseReasons(
  current: ReviewInputManifest,
  previous: ReviewInputManifest | undefined,
  trusted: boolean,
): ReviewReuseReason[] {
  const reasons: ReviewReuseReason[] = [];
  if (
    !previous ||
    !isReviewInputManifestValid(current) ||
    !isReviewInputManifestValid(previous) ||
    current.contextHash === null ||
    previous.contextHash === null
  )
    reasons.push('input-unverifiable');
  if (!trusted) reasons.push('artifact-untrusted');
  if (previous)
    for (const [field, reason] of INPUT_REASONS)
      if (current[field] !== previous[field]) reasons.push(reason);
  return reasons;
}
