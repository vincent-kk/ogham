import { isReviewInputManifestValid } from '../hash/isReviewInputManifestValid.js';
import type {
  ReviewReuseCandidate,
  ReviewReuseReason,
} from '../state/reviewIncrementalTypes.js';

/** Digest fields retain distinct reasons in the decision artifact. */
const INPUT_REASONS = [
  ['sourceHash', 'source-input-changed'],
  ['rulesHash', 'rules-changed'],
  ['evidenceHash', 'evidence-changed'],
  ['contextHash', 'context-changed'],
  ['policyHash', 'policy-incompatible'],
] as const;

/**
 * Compare one unambiguous origin with current observed semantic inputs.
 * @param current Current assignment and observed input manifest.
 * @param previous Matched origin with independently checked artifact trust.
 * @returns Every direct reason to rerun, before dependency propagation.
 */
export function resolveReviewReuseReasons(
  current: ReviewReuseCandidate,
  previous: ReviewReuseCandidate,
): ReviewReuseReason[] {
  const reasons: ReviewReuseReason[] = [];
  if (
    !current.input ||
    !previous.input ||
    !isReviewInputManifestValid(current.input) ||
    !isReviewInputManifestValid(previous.input) ||
    current.input.contextHash === null ||
    previous.input.contextHash === null
  )
    reasons.push('input-unverifiable');
  if (!previous.trusted || !previous.complete)
    reasons.push('artifact-untrusted');
  if (current.input && previous.input)
    for (const [field, reason] of INPUT_REASONS)
      if (current.input[field] !== previous.input[field]) reasons.push(reason);
  if (
    current.rounds !== previous.rounds &&
    !reasons.includes('policy-incompatible')
  )
    reasons.push('policy-incompatible');
  return reasons;
}
