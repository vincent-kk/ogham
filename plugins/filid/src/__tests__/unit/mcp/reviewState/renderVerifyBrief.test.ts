import { describe, expect, it } from 'vitest';

import { REVIEW_BRIEF_INLINE_DIFF_LIMIT } from '../../../../constants/reviewState.js';
import { renderVerifyBrief } from '../../../../mcp/tools/reviewState/brief/renderVerifyBrief.js';
import { checkVerifyOpinion } from '../../../../mcp/tools/reviewState/opinion/checkVerifyOpinion.js';
import { parseVerifyOpinion } from '../../../../mcp/tools/reviewState/opinion/parseVerifyOpinion.js';
import type { ReviewValidationProblem } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildVerifyBriefInput } from './helpers/buildVerifyBriefInput.js';

/** Output-contract JSON fence captured from a rendered brief. */
const OUTPUT_CONTRACT_PATTERN =
  /## Output Contract\n\n```json\n([\s\S]*?)\n```/;

describe('renderVerifyBrief', () => {
  it('renders a valid decision for assigned findings without FCA candidate or deterministic-refute rows', () => {
    const input = buildVerifyBriefInput();
    const output = renderVerifyBrief(input);
    const contract = output.match(OUTPUT_CONTRACT_PATTERN)?.[1] ?? '';
    const parsed = parseVerifyOpinion(contract);
    const decisionIds = ['R01-001'];
    const problems: ReviewValidationProblem[] = [];

    expect(parsed.problems).toEqual([]);
    expect(parsed.opinion?.decisions.map(({ findingId }) => findingId)).toEqual(
      decisionIds,
    );
    expect(
      checkVerifyOpinion(
        parsed.opinion!,
        {
          group: input.group.id,
          sourceHash: input.sourceHash,
          decisionIds,
        },
        problems,
      ),
    ).toBe(true);
    expect(problems).toEqual([]);
    expect(contract).not.toContain('CONFIRMED | REFUTED | INDETERMINATE');
    expect(output).not.toContain('FCA-001');
    expect(output).not.toContain('R01-002');
  });

  it('embeds only Deliverable onward verbatim and omits Prior Verifier Guidance', () => {
    const input = buildVerifyBriefInput();
    const output = renderVerifyBrief(input);
    expect(output).toContain(
      input.verifierMethod.slice(
        input.verifierMethod.indexOf('## Deliverable'),
      ),
    );
    expect(output).not.toContain('## Re-verification Mode');
    expect(output).not.toContain('## Prior Verifier Guidance');
    expect(output.indexOf('## Deliverable')).toBeLessThan(
      output.indexOf('## Files'),
    );
  });

  it('keeps out-of-diff findings citing FCA-1 and USR- rules assigned', () => {
    const input = buildVerifyBriefInput();
    input.findings = [
      { ...input.findings[1]!, rule: 'FCA-1' },
      { ...input.findings[1]!, id: 'R01-003', rule: 'USR-contract' },
    ];
    const output = renderVerifyBrief(input);
    expect(output).toContain('R01-002');
    expect(output).toContain('R01-003');
    expect(output).not.toContain('FCA-001');
  });

  it.each([REVIEW_BRIEF_INLINE_DIFF_LIMIT, REVIEW_BRIEF_INLINE_DIFF_LIMIT + 1])(
    'bounds verifier Diffs at %i bytes',
    (size) => {
      const input = buildVerifyBriefInput();
      const diffText = 'x'.repeat(size);
      input.diffs = [{ unit: input.group.units[0]!, diffText }];
      const output = renderVerifyBrief(input);
      expect(output).toContain('## Diffs');
      expect(output.includes(diffText)).toBe(
        size <= REVIEW_BRIEF_INLINE_DIFF_LIMIT,
      );
      expect(output.includes('see Diff Path column')).toBe(
        size > REVIEW_BRIEF_INLINE_DIFF_LIMIT,
      );
    },
  );

  it('states exact decision-set and allowed-verdict requirements', () => {
    const output = renderVerifyBrief(buildVerifyBriefInput());

    expect(output).toContain(
      'The `decisions` array must contain every ID in Decisions Required exactly once and no other ID.',
    );
    expect(output).toContain(
      '`verdict` must be `CONFIRMED`, `REFUTED`, or `INDETERMINATE`.',
    );
  });
});
