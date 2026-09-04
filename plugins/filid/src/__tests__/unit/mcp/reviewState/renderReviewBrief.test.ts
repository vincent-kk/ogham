import { describe, expect, it } from 'vitest';

import { renderReviewBrief } from '../../../../mcp/tools/reviewState/brief/renderReviewBrief.js';
import { checkReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/checkReviewOpinion.js';
import { parseReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/parseReviewOpinion.js';

import { buildReviewBriefInput } from './helpers/buildReviewBriefInput.js';

/** Output-contract JSON fence captured from a rendered brief. */
const OUTPUT_CONTRACT_PATTERN =
  /## Output Contract\n\n```json\n([\s\S]*?)\n```/;

describe('renderReviewBrief', () => {
  it('renders a valid schema-7 reviewer opinion example', () => {
    const input = buildReviewBriefInput();
    const output = renderReviewBrief(input);
    const contract = output.match(OUTPUT_CONTRACT_PATTERN)?.[1] ?? '';
    const parsed = parseReviewOpinion(contract);

    expect(parsed.problems).toEqual([]);
    expect(parsed.opinion).not.toBeNull();
    expect(
      checkReviewOpinion(parsed.opinion!, {
        group: input.group.id,
        round: 1,
        sourceHash: input.sourceHash,
        units: input.group.units,
      }),
    ).toEqual([]);
    expect(contract).not.toContain('COMPLETE | INDETERMINATE');
    expect(contract).not.toContain('reviewed | skipped');
  });

  it('states chunk identity and skipped-result requirements', () => {
    const output = renderReviewBrief(buildReviewBriefInput());

    expect(output).toContain(
      '`chunk` must be `"k/n"` for a chunked unit and `null` for an unchunked unit.',
    );
    expect(output).toContain(
      'A `skipped` result requires a non-empty `reason`.',
    );
    expect(output).toContain('| src/b.ts | M | source | src | 2/3 |');
    expect(output).toContain(
      '`existingCode` is required and must not be empty.',
    );
  });
});
