import { describe, expect, it } from 'vitest';

import { checkVerifyOpinion } from '../../../../mcp/tools/reviewState/opinion/checkVerifyOpinion.js';
import { mergeReviewRounds } from '../../../../mcp/tools/reviewState/opinion/mergeReviewRounds.js';
import { parseReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/parseReviewOpinion.js';
import { parseVerifyOpinion } from '../../../../mcp/tools/reviewState/opinion/parseVerifyOpinion.js';
import type { ReviewValidationProblem } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { createVerdictFoldFixture } from './helpers/createVerdictFoldFixture.js';

/** Valid evidence-recovery advice shared by parser regression cases. */
const ADVICE = {
  question: 'Which contract applies?',
  evidenceNeeded: ['The owning DETAIL acceptance group'],
  nextAction: 'Read the contract and compare its recorded evidence.',
  doneWhen: 'The contract can be confirmed or refuted with evidence.',
  suggestedOwner: 'agent' as const,
};

/** Exact gap identity retained while its optional advice evolves. */
const GAP = {
  path: '.',
  rule: 'FCA-11',
  detail: 'The project contract evidence is incomplete.',
};

/**
 * Parse a real schema-7 opinion carrying one deliberately varied advice object.
 * @param resolution Untrusted JSON-compatible advice under test.
 * @returns The public structural parse result.
 */
function parseGap(resolution: unknown) {
  const review = createVerdictFoldFixture().groups[0]!.review!;
  return parseReviewOpinion(
    JSON.stringify({ ...review, gaps: [{ ...GAP, resolution }] }),
  );
}

describe('review blocker resolution', () => {
  it('continues reading legacy reviewer and verifier opinions without resolution', () => {
    const group = createVerdictFoldFixture().groups[0]!;
    expect(parseReviewOpinion(JSON.stringify(group.review)).problems).toEqual(
      [],
    );
    expect(parseVerifyOpinion(JSON.stringify(group.verify)).problems).toEqual(
      [],
    );
  });

  it.each(['agent', 'human', 'unknown'] as const)(
    'retains %s advice even on a COMPLETE review gap',
    (suggestedOwner) => {
      const resolution = {
        ...ADVICE,
        suggestedOwner,
        ...(suggestedOwner === 'human'
          ? {
              humanReason:
                'The intended contract has two valid interpretations.',
              options: ['Preserve current behavior', 'Adopt the new contract'],
            }
          : {}),
      };
      const parsed = parseGap(resolution);
      expect(parsed.problems).toEqual([]);
      expect(parsed.opinion!.gaps[0]).toMatchObject({ resolution });
    },
  );

  it.each([
    ['question', 240],
    ['nextAction', 600],
    ['doneWhen', 600],
    ['humanReason', 400],
  ] as const)('enforces the %s trimmed length boundary', (field, limit) => {
    expect(
      parseGap({ ...ADVICE, [field]: ` ${'x'.repeat(limit)} ` }).problems,
    ).toEqual([]);
    expect(
      parseGap({ ...ADVICE, [field]: 'x'.repeat(limit + 1) }).opinion,
    ).toBeNull();
    expect(parseGap({ ...ADVICE, [field]: ' ' }).opinion).toBeNull();
  });

  it.each([
    { question: '' },
    { suggestedOwner: 'reviewer' },
    { suggestedOwner: 'human' },
    { evidenceNeeded: [] },
    { evidenceNeeded: [' '] },
    { evidenceNeeded: ['x'.repeat(301)] },
    { evidenceNeeded: ['a', 'b', 'c', 'd', 'e', 'f'] },
    { instruction: 'run an unrelated command' },
  ])('rejects malformed or incomplete advice %j', (invalid) => {
    expect(parseGap({ ...ADVICE, ...invalid }).opinion).toBeNull();
  });

  it('accepts the maximum bounded evidence list', () => {
    expect(
      parseGap({
        ...ADVICE,
        evidenceNeeded: Array.from({ length: 5 }, () => 'x'.repeat(300)),
      }).problems,
    ).toEqual([]);
  });

  it('preserves verifier-wide and decision-specific indeterminate advice', () => {
    const verify = createVerdictFoldFixture().groups[0]!.verify!;
    const parsed = parseVerifyOpinion(
      JSON.stringify({
        ...verify,
        state: 'INDETERMINATE',
        resolution: ADVICE,
        decisions: [
          {
            findingId: 'R01-001',
            verdict: 'INDETERMINATE',
            evidence: 'Fixture unavailable',
            reason: 'The runtime result is unknown.',
            resolution: ADVICE,
          },
        ],
      }),
    );
    expect(parsed.problems).toEqual([]);
    const problems: ReviewValidationProblem[] = [];
    expect(
      checkVerifyOpinion(
        parsed.opinion!,
        { group: '01', sourceHash: 'source-hash', decisionIds: ['R01-001'] },
        problems,
      ),
    ).toBe(true);
    expect(parsed.opinion).toMatchObject({
      resolution: ADVICE,
      decisions: [{ resolution: ADVICE }],
    });
  });

  it.each(['opinion', 'decision'] as const)(
    'rejects resolution on a conclusive verifier %s',
    (target) => {
      const verify = createVerdictFoldFixture().groups[0]!.verify!;
      const parsed = parseVerifyOpinion(
        JSON.stringify({
          ...verify,
          ...(target === 'opinion' ? { resolution: ADVICE } : {}),
          decisions:
            target === 'decision'
              ? [
                  {
                    findingId: 'R01-001',
                    verdict: 'CONFIRMED',
                    evidence: 'Reproduced',
                    reason: 'The claim holds.',
                    resolution: ADVICE,
                  },
                ]
              : [],
        }),
      );
      expect(parsed.problems).toEqual([]);
      const problems: ReviewValidationProblem[] = [];
      expect(
        checkVerifyOpinion(
          parsed.opinion!,
          {
            group: '01',
            sourceHash: 'source-hash',
            decisionIds: target === 'decision' ? ['R01-001'] : [],
          },
          problems,
        ),
      ).toBe(false);
      expect(problems).toContainEqual(
        expect.objectContaining({ code: 'enum-invalid' }),
      );
    },
  );

  it('enriches repeated gap advice without clearing gaps or indeterminate state', () => {
    const review = createVerdictFoldFixture().groups[0]!.review!;
    const prior = {
      ...review,
      state: 'INDETERMINATE' as const,
      gaps: [{ ...GAP, resolution: ADVICE }],
    };
    const current = {
      ...review,
      round: 2,
      gaps: [
        {
          ...GAP,
          resolution: {
            ...ADVICE,
            nextAction: 'Read the newly available evidence.',
          },
        },
      ],
    };
    const before = JSON.stringify([prior, current]);
    const result = mergeReviewRounds(prior, current).opinion;
    expect(result.state).toBe('INDETERMINATE');
    expect(result.gaps).toEqual(current.gaps);
    expect(JSON.stringify([prior, current])).toBe(before);
    expect(
      mergeReviewRounds(result, { ...review, round: 3, gaps: [GAP] }).opinion
        .gaps,
    ).toEqual(current.gaps);
  });
});
