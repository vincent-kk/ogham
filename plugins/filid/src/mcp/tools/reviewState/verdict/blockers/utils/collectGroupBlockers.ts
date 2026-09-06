import type {
  ReviewBlockerCause,
  SealGroupEvidence,
} from '../../reviewVerdictTypes.js';

/**
 * Expose trust failures and only trusted actor gaps or verifier-wide uncertainty.
 * @param groups Prepared groups with validated artifact references and trust issues.
 * @returns Typed causes with actor proposals preserved as non-executable data.
 */
export function collectGroupBlockers(
  groups: readonly SealGroupEvidence[],
): ReviewBlockerCause[] {
  const causes: ReviewBlockerCause[] = [];
  for (const [index, evidence] of groups.entries()) {
    const { group, review, verify } = evidence;
    const scope = {
      path: null,
      groupId: group.id,
      findingId: null,
      rule: null,
    };
    const issues = evidence.issues.length
      ? evidence.issues
      : !review || !verify
        ? ['artifact not validated']
        : [];
    for (const detail of issues)
      causes.push({
        kind: 'artifact-trust',
        scope,
        detail,
        sources: [
          {
            artifactPath: 'review-state.json',
            pointer: `/groups/${index}/validated`,
          },
          { artifactPath: group.opinionPath },
          { artifactPath: group.verifyPath },
        ],
        adviceSource: 'deterministic',
        resolution: {
          question: `Can group ${group.id}'s artifact validation be trusted?`,
          evidenceNeeded: [
            'Complete review and verifier validation with matching artifact and review-binding hashes',
          ],
          nextAction:
            'Inspect the affected artifact and its validation diagnostics. Restore valid evidence through the existing review workflow without expanding retry limits.',
          doneWhen:
            'The required review and verifier artifacts pass validation and their hashes remain correctly bound in a new review.',
          suggestedOwner: 'agent',
        },
      });
    if (issues.length > 0) continue;
    for (const [gapIndex, gap] of (review?.gaps ?? []).entries())
      causes.push({
        kind: 'review-gap',
        scope: { ...scope, path: gap.path, rule: gap.rule },
        detail: gap.detail,
        sources: [
          { artifactPath: group.opinionPath, pointer: `/gaps/${gapIndex}` },
        ],
        resolution: gap.resolution,
        adviceSource: gap.resolution ? 'actor' : undefined,
      });
    if (verify?.state === 'INDETERMINATE')
      causes.push({
        kind: 'verifier-indeterminate',
        scope,
        detail: 'Verifier opinion is indeterminate.',
        sources: [{ artifactPath: group.verifyPath, pointer: '/state' }],
        resolution: verify.resolution,
        adviceSource: verify.resolution ? 'actor' : undefined,
      });
  }
  return causes;
}
