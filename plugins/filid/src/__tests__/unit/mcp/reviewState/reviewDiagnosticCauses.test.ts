import { describe, expect, it } from 'vitest';

import { checkReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/checkReviewOpinion.js';
import { parseReviewOpinion } from '../../../../mcp/tools/reviewState/opinion/parseReviewOpinion.js';
import type { ReviewValidationProblem } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { foldReviewVerdict } from '../../../../mcp/tools/reviewState/verdict/foldReviewVerdict.js';

import { createVerdictFoldFixture } from './helpers/createVerdictFoldFixture.js';

const DIAGNOSTIC = {
  code: 'unresolved-local-dependency',
  message: 'Cannot resolve ./moved.js from src/a.ts',
  path: 'src/a.ts',
  causeId: 'dependency:a:moved',
  specifier: './moved.js',
  affects: ['dependencies', 'boundaries'] as const,
};

describe('prepared diagnostic causes', () => {
  it('keeps an independent verification gap beside dependency diagnostics', () => {
    const input = createVerdictFoldFixture();
    input.evidence.evidenceComplete = false;
    input.evidence.verificationStatus = 'indeterminate';
    input.evidence.diagnostics = [DIAGNOSTIC];
    const blockers = foldReviewVerdict(input).blockers;
    expect(blockers).toHaveLength(2);
    expect(
      blockers.some((blocker) =>
        blocker.resolution.question.includes('verification'),
      ),
    ).toBe(true);
  });
  it('merges eight gap references and the diagnostic without losing occurrences', () => {
    const input = createVerdictFoldFixture();
    input.evidence.evidenceComplete = false;
    input.evidence.diagnostics = [DIAGNOSTIC];
    const group = input.groups[0]!;
    input.groups = Array.from({ length: 8 }, (_, index) => ({
      ...group,
      group: {
        ...group.group,
        id: String(index),
        candidateIds: [],
        opinionPath: `opinions/review-${index}.json`,
      },
      review: {
        ...group.review!,
        gaps: [
          {
            path: `src/${index}.ts`,
            rule: 'FCA-13',
            detail: `Group ${index} cannot assess imports`,
            causeId: DIAGNOSTIC.causeId,
          },
        ],
      },
    }));
    input.candidates = [];
    const blockers = foldReviewVerdict(input).blockers;
    expect(blockers).toHaveLength(1);
    expect(blockers[0]?.occurrences).toHaveLength(9);
    expect(blockers[0]?.sources).toHaveLength(10);
    expect(blockers[0]?.resolution).toMatchObject({ suggestedOwner: 'agent' });
    expect(blockers[0]?.resolution.nextAction).toContain('dependencies');
    expect(blockers[0]?.detail).toContain('./moved.js');
  });

  it('does not merge independent diagnostics sharing FCA-13', () => {
    const input = createVerdictFoldFixture();
    input.evidence.evidenceComplete = false;
    input.evidence.diagnostics = [
      DIAGNOSTIC,
      { ...DIAGNOSTIC, causeId: 'dependency:b:other', specifier: './other.js' },
    ];
    expect(foldReviewVerdict(input).blockers).toHaveLength(2);
  });

  it('requests actionable advice for a gap with no prepared cause', () => {
    const input = createVerdictFoldFixture();
    const opinion = input.groups[0]!.review!;
    opinion.gaps = [
      { path: 'src/a.ts', rule: 'FCA-13', detail: 'Unavailable evidence' },
    ];
    const problems: ReviewValidationProblem[] = [];
    expect(
      checkReviewOpinion(
        opinion,
        {
          group: '01',
          round: 1,
          sourceHash: 'source-hash',
          units: input.groups[0]!.group.units,
          policy: input.groups[0]!.group,
          diagnostics: [],
        },
        problems,
      ),
    ).toBe(false);
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'gap-required' }),
      ]),
    );
  });

  it('rejects a cause reference absent from prepared evidence', () => {
    const input = createVerdictFoldFixture();
    const opinion = input.groups[0]!.review!;
    opinion.gaps = [
      {
        path: 'src/a.ts',
        rule: 'FCA-13',
        detail: 'Unknown cause',
        causeId: 'invented',
      },
    ];
    const problems: ReviewValidationProblem[] = [];
    expect(
      checkReviewOpinion(
        opinion,
        {
          group: '01',
          round: 1,
          sourceHash: 'source-hash',
          units: input.groups[0]!.group.units,
          policy: input.groups[0]!.group,
          diagnostics: [DIAGNOSTIC],
        },
        problems,
      ),
    ).toBe(false);
  });

  it('requires concrete options as well as a reason for human decisions', () => {
    const opinion = createVerdictFoldFixture().groups[0]!.review!;
    const resolution = {
      question: 'Which contract?',
      evidenceNeeded: ['Product intent'],
      nextAction: 'Choose the contract',
      doneWhen: 'The choice is recorded',
      suggestedOwner: 'human',
      humanReason: 'Both contracts are valid',
    };
    const parse = (advice: unknown) =>
      parseReviewOpinion(
        JSON.stringify({
          ...opinion,
          gaps: [
            {
              path: '.',
              rule: 'FCA-13',
              detail: 'Ambiguous intent',
              resolution: advice,
            },
          ],
        }),
      );
    expect(parse(resolution).opinion).toBeNull();
    expect(
      parse({
        ...resolution,
        options: ['Preserve current semantics', 'Adopt requested semantics'],
      }).problems,
    ).toEqual([]);
  });
});
