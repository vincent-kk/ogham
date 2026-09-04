import { REVIEW_OPINION_SCHEMA_VERSION } from '../../../../../constants/reviewState.js';
import type { RenderReviewBriefInput } from '../reviewBriefTypes.js';

/**
 * Render a semantically valid schema-seven reviewer opinion example.
 * @param input Prepared group and source identity represented by the brief.
 * @param round One-based reviewer round represented by the example.
 * @returns Pretty JSON whose file assignments satisfy the prepared group.
 */
export function renderReviewOpinionExample(
  input: RenderReviewBriefInput,
  round = 1,
): string {
  const primaryUnit = input.group.units[0];
  return JSON.stringify(
    {
      schema: REVIEW_OPINION_SCHEMA_VERSION,
      group: input.group.id,
      round,
      state: 'COMPLETE',
      sourceHash: input.sourceHash,
      files: input.group.units.map((unit) => ({
        path: unit.path,
        change: unit.change,
        chunk: unit.chunk ? `${unit.chunk.index}/${unit.chunk.total}` : null,
        result: 'reviewed',
        reason: null,
      })),
      findings: primaryUnit
        ? [
            {
              id: `R${input.group.id}-001`,
              severity: 'error',
              category: 'bug',
              path: primaryUnit.path,
              existingCode: '<replace with exact existing code>',
              lines: 'unknown',
              rule: '<rule id>',
              message: '<falsifiable defect statement>',
              evidence: `${primaryUnit.path}:<line>`,
              consequence: '<what fails>',
              recommendedAction: '<bounded correction>',
            },
          ]
        : [],
      checked: [
        ...new Set([
          ...input.group.units.map(({ path }) => path),
          ...input.candidates.map(({ id }) => id),
        ]),
      ],
      gaps: [],
      riskPlan: null,
    },
    null,
    2,
  );
}
