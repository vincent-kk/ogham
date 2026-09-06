import { REVIEW_OPINION_SCHEMA_VERSION } from '../../../../../constants/reviewState.js';
import { mergeVerifierAssignment } from '../../opinion/mergeVerifierAssignment.js';
import type { RenderVerifyBriefInput } from '../reviewBriefTypes.js';

/**
 * Render a semantically valid verifier opinion covering every required ID.
 * @param input Located findings and the group whose unresolved prior findings stay assigned.
 * @returns Compact JSON with the exact required decision identity set.
 */
export function renderVerifyOpinionExample(
  input: RenderVerifyBriefInput,
): string {
  const decisionIds = mergeVerifierAssignment(
    input.findings,
    input.group.priorFindings,
  ).assigned.map(({ id }) => id);
  return JSON.stringify({
    schema: REVIEW_OPINION_SCHEMA_VERSION,
    group: input.group.id,
    state: 'COMPLETE',
    sourceHash: input.sourceHash,
    decisions: decisionIds.map((findingId) => ({
      findingId,
      verdict: 'CONFIRMED',
      evidence: '<independent evidence>',
      reason: '<one falsifiable sentence>',
    })),
    observations: [],
    checked: [...new Set(input.group.units.map(({ path }) => path))],
  });
}
