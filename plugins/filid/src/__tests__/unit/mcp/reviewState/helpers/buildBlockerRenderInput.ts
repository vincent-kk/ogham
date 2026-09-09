import type { ReviewOpinionGap } from '../../../../../mcp/tools/reviewState/opinion/reviewOpinionTypes.js';
import type { ReviewRenderInput } from '../../../../../mcp/tools/reviewState/render/reviewRenderTypes.js';
import { foldReviewVerdict } from '../../../../../mcp/tools/reviewState/verdict/foldReviewVerdict.js';

import { buildReviewRenderInput } from './buildReviewRenderInput.js';
import { createVerdictFoldFixture } from './createVerdictFoldFixture.js';

/**
 * Build a renderer input whose mixed attention routes come from the real fold.
 * @param count Number of distinct actor gaps to include, excluding the analysis blocker.
 * @returns An inconclusive report input with complete source identity and real blockers.
 */
export function buildBlockerRenderInput(count = 8): ReviewRenderInput {
  const input = createVerdictFoldFixture();
  input.evidence.evidenceComplete = false;
  input.groups[0]!.review!.gaps = Array.from(
    { length: count },
    (_, index): ReviewOpinionGap => ({
      path: 'src/a.ts',
      rule: `RULE-${index}`,
      detail: `Unknown evidence for contract ${index}.`,
      ...(index % 3 === 2
        ? {}
        : {
            resolution: {
              question: `Which contract applies to case ${index}?`,
              evidenceNeeded: [`Acceptance group ${index}`],
              nextAction: `Check contract ${index} against the recorded evidence.`,
              doneWhen: `Contract ${index} has a validated disposition.`,
              suggestedOwner: index % 3 === 0 ? 'human' : 'agent',
              ...(index % 3 === 0
                ? {
                    humanReason:
                      'The intended contract requires a policy choice.',
                    options: [
                      'Preserve current behavior',
                      'Adopt the new contract',
                    ],
                  }
                : {}),
            },
          }),
    }),
  );
  return {
    ...buildReviewRenderInput(),
    evidence: input.evidence,
    files: input.files,
    fold: foldReviewVerdict(input),
  };
}
