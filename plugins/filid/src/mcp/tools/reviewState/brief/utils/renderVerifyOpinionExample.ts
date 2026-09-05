import { REVIEW_OPINION_SCHEMA_VERSION } from '../../../../../constants/reviewState.js';
import { splitVerifierAssignment } from '../../opinion/splitVerifierAssignment.js';
import type { RenderVerifyBriefInput } from '../reviewBriefTypes.js';

/**
 * Render a semantically valid verifier opinion covering every required ID.
 * @param input Located findings partitioned by the shared verifier assignment rule.
 * @returns Pretty JSON with the exact required decision identity set.
 */
export function renderVerifyOpinionExample(
  input: RenderVerifyBriefInput,
): string {
  const decisionIds = splitVerifierAssignment(input.findings).assigned.map(
    ({ id }) => id,
  );
  return JSON.stringify(
    {
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
    },
    null,
    2,
  );
}
