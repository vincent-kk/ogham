import { REVIEW_OPINION_SCHEMA_VERSION } from '../../../../../constants/reviewState.js';
import type { RenderVerifyBriefInput } from '../reviewBriefTypes.js';

/**
 * Render a semantically valid verifier opinion covering every required ID.
 * @param input Reviewer findings and FCA candidates represented by the brief.
 * @returns Pretty JSON with the exact required decision identity set.
 */
export function renderVerifyOpinionExample(
  input: RenderVerifyBriefInput,
): string {
  const decisionIds = [
    ...input.findings.map(({ id }) => id),
    ...input.candidates.map(({ id }) => id),
  ];
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
