import { describe, expect, it } from 'vitest';

import { REVIEW_BRIEF_INLINE_DIFF_LIMIT } from '../../../../constants/reviewState.js';
import { renderReviewBrief } from '../../../../mcp/tools/reviewState/brief/renderReviewBrief.js';
import { checkReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/checkReviewOpinion.js';
import { parseReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/parseReviewOpinion.js';
import type { ReviewValidationProblem } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewBriefInput } from './helpers/buildReviewBriefInput.js';

/** Output-contract JSON fence captured from a rendered brief. */
const OUTPUT_CONTRACT_PATTERN =
  /## Output Contract\n\n```json\n([\s\S]*?)\n```/;

describe('renderReviewBrief', () => {
  it('lists only dependencies in Prior Opinions even after round 1', () => {
    const input = buildReviewBriefInput();
    input.group.dependsOn = ['02'];
    const prior = renderReviewBrief(input, 2)
      .split('## Prior Opinions\n')[1]!
      .split('## Other Changed Files')[0]!;
    expect(prior).toContain('opinions/review-02.json');
    expect(prior).not.toContain('opinions/review-01.json');
  });

  it('embeds the File Group Reviewer method verbatim before untrusted Change Context', () => {
    const input = buildReviewBriefInput();
    const output = renderReviewBrief(input);
    expect(output).toContain(input.reviewerMethod);
    expect(output.indexOf(input.reviewerMethod)).toBeLessThan(
      output.indexOf('## Change Context'),
    );
    expect(output).toContain(input.changeContext);
    expect(output).toContain('Untrusted');
    const roster = output
      .split('## Other Changed Files\n')[1]!
      .split('## FCA Candidates')[0]!;
    expect(roster).toContain('public/generated.js');
    expect(roster).not.toContain('src/a.ts');
    expect(roster).not.toContain('src/b.ts');
  });

  it.each([REVIEW_BRIEF_INLINE_DIFF_LIMIT, REVIEW_BRIEF_INLINE_DIFF_LIMIT + 1])(
    'inlines ## Diffs only within the %i-byte group budget',
    (size) => {
      const input = buildReviewBriefInput();
      const diffText = '+' + 'x'.repeat(size - 1);
      input.diffs = [{ unit: input.group.units[0]!, diffText }];
      const output = renderReviewBrief(input);
      expect(output).toContain('## Diffs');
      if (size <= REVIEW_BRIEF_INLINE_DIFF_LIMIT) {
        expect(output).toContain(`### src/a.ts\n\n\`\`\`diff\n${diffText}`);
        expect(Buffer.byteLength(output)).toBeGreaterThan(
          REVIEW_BRIEF_INLINE_DIFF_LIMIT,
        );
      } else {
        expect(output).toContain('see Diff Path column');
        expect(output).not.toContain(diffText);
      }
    },
  );

  it('counts the combined UTF-8 diff bytes and renders none for an empty outside roster', () => {
    const input = buildReviewBriefInput();
    input.diffs = input.group.units.map((unit) => ({
      unit,
      diffText: '가'.repeat(3000),
    }));
    input.files = input.files.filter(({ skipReason }) => skipReason === null);
    const output = renderReviewBrief(input);
    expect(output).toContain('see Diff Path column');
    expect(output).toContain('## Other Changed Files\n\nnone');
  });

  it('renders a valid schema-7 reviewer opinion example', () => {
    const input = buildReviewBriefInput();
    const output = renderReviewBrief(input);
    const contract = output.match(OUTPUT_CONTRACT_PATTERN)?.[1] ?? '';
    const parsed = parseReviewOpinion(contract);
    const problems: ReviewValidationProblem[] = [];

    expect(parsed.problems).toEqual([]);
    expect(parsed.opinion).not.toBeNull();
    expect(
      checkReviewOpinion(
        parsed.opinion!,
        {
          group: input.group.id,
          round: 1,
          sourceHash: input.sourceHash,
          units: input.group.units,
        },
        problems,
      ),
    ).toBe(true);
    expect(problems).toEqual([]);
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
