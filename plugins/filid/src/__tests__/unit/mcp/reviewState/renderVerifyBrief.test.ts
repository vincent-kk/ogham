import { describe, expect, it } from 'vitest';

import { renderVerifyBrief } from '../../../../mcp/tools/reviewState/brief/renderVerifyBrief.js';
import { checkVerifyOpinion } from '../../../../mcp/tools/reviewState/opinion/checkVerifyOpinion.js';
import { parseVerifyOpinion } from '../../../../mcp/tools/reviewState/opinion/parseVerifyOpinion.js';
import type { ReviewValidationProblem } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildVerifyBriefInput } from './helpers/buildVerifyBriefInput.js';

/** Output-contract JSON fence captured from a rendered brief. */
const OUTPUT_CONTRACT_PATTERN =
  /## Output Contract\n\n```json\n([\s\S]*?)\n```/;

describe('renderVerifyBrief', () => {
  it('renders a valid decision for every required reviewer and FCA ID', () => {
    const input = buildVerifyBriefInput();
    const output = renderVerifyBrief(input);
    const contract = output.match(OUTPUT_CONTRACT_PATTERN)?.[1] ?? '';
    const parsed = parseVerifyOpinion(contract);
    const decisionIds = [
      ...input.findings.map(({ id }) => id),
      ...input.candidates.map(({ id }) => id),
    ];
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
  });

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
