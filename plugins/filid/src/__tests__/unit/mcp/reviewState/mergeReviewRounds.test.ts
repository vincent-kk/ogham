import { describe, expect, it } from 'vitest';

import { mergeReviewRounds } from '../../../../mcp/tools/reviewState/opinion/mergeReviewRounds.js';

/** Review-opinion input inferred from the pure merge boundary. */
type ReviewOpinion = Parameters<typeof mergeReviewRounds>[1];

/** Finding input inferred from a mergeable review opinion. */
type ReviewFinding = ReviewOpinion['findings'][number];

/** File-result input inferred from a mergeable review opinion. */
type ReviewFileResult = ReviewOpinion['files'][number];

/** Shared valid reviewer finding fields for round-merging fixtures. */
const BASE_FINDING = {
  id: 'R01-099',
  severity: 'error',
  category: 'bug',
  path: 'src/a.ts',
  existingCode: 'return stale;',
  lines: '7-7',
  inDiff: true,
  rule: 'DEF-1',
  message: 'The stale value is returned.',
  evidence: 'src/a.ts:7',
  consequence: 'The caller receives stale data.',
  recommendedAction: 'Return the current value.',
} as const;

/** Shared valid reviewed-file fields for round-merging fixtures. */
const BASE_FILE = {
  path: 'src/a.ts',
  change: 'M',
  chunk: null,
  result: 'reviewed',
  reason: null,
} as const;

/** Shared valid review-opinion fields for round-merging fixtures. */
const BASE_OPINION = {
  schema: 7,
  group: '01',
  state: 'COMPLETE',
  sourceHash: 'source-hash',
  checked: [],
  gaps: [],
  riskPlan: null,
} as const;

/**
 * Build one typed fixture value by applying explicit field overrides.
 *
 * @param base Complete default fixture value.
 * @param overrides Fields intentionally varied by the current case.
 * @returns New fixture value with the requested overrides.
 */
function makeFixture<T>(base: T, overrides: Partial<T> = {}): T {
  return { ...base, ...overrides };
}

/**
 * Build one structurally valid review opinion for a selected round.
 *
 * @param round One-based reviewer round represented by the fixture.
 * @param overrides Opinion fields intentionally varied by the current case.
 * @returns Structurally valid review opinion.
 */
function makeOpinion(
  round: number,
  overrides: Partial<ReviewOpinion> = {},
): ReviewOpinion {
  return {
    ...BASE_OPINION,
    round,
    files: [makeFixture<ReviewFileResult>(BASE_FILE)],
    findings: [],
    ...overrides,
  } as ReviewOpinion;
}

describe('mergeReviewRounds', () => {
  it('counts round-one findings without rewriting the validated opinion', () => {
    const current = makeOpinion(1, {
      findings: [
        makeFixture<ReviewFinding>(BASE_FINDING, { id: 'R01-900' }),
        makeFixture<ReviewFinding>(BASE_FINDING, {
          id: 'R01-901',
          existingCode: 'return older;',
        }),
      ],
    });
    const result = mergeReviewRounds(null, current);

    expect(result.newFindings).toBe(2);
    expect(result.opinion).toEqual(current);
  });

  it('deduplicates the exact finding key without counting it as new', () => {
    const prior = makeOpinion(1, {
      findings: [makeFixture<ReviewFinding>(BASE_FINDING)],
    });
    const current = makeOpinion(2, {
      findings: [
        makeFixture<ReviewFinding>(BASE_FINDING, {
          id: 'R01-777',
          message: 'A later round restated the same defect.',
        }),
      ],
    });
    const result = mergeReviewRounds(prior, current);

    expect(result.newFindings).toBe(0);
    expect(result.opinion.round).toBe(2);
    expect(result.opinion.findings).toHaveLength(1);
    expect(result.opinion.findings[0].id).toBe('R01-001');
  });

  it('preserves unknown-line findings when their existing code differs', () => {
    const result = mergeReviewRounds(
      makeOpinion(1, {
        findings: [
          makeFixture<ReviewFinding>(BASE_FINDING, {
            lines: 'unknown',
            inDiff: false,
          }),
        ],
      }),
      makeOpinion(2, {
        findings: [
          makeFixture<ReviewFinding>(BASE_FINDING, {
            id: 'R01-777',
            lines: 'unknown',
            inDiff: false,
            existingCode: 'return anotherStaleValue;',
          }),
        ],
      }),
    );

    expect(result.newFindings).toBe(1);
    expect(
      result.opinion.findings.map(({ existingCode }) => existingCode),
    ).toEqual(['return stale;', 'return anotherStaleValue;']);
  });

  it('folds stable unions while preserving conservative cross-round states', () => {
    const prior = makeOpinion(1, {
      checked: ['src/a.ts'],
      gaps: [{ path: 'src/a.ts', rule: 'DEF-4', detail: 'First gap.' }],
      riskPlan: 'Inspect the state transition before reviewing findings.',
    });
    const current = makeOpinion(3, {
      state: 'INDETERMINATE',
      files: [
        makeFixture<ReviewFileResult>(BASE_FILE, {
          result: 'skipped',
          reason: 'Diff could not be read.',
        }),
        makeFixture<ReviewFileResult>(BASE_FILE, { path: 'src/b.ts' }),
      ],
      checked: ['src/a.ts', 'src/b.ts'],
      gaps: [
        { path: 'src/a.ts', rule: 'DEF-4', detail: 'First gap.' },
        { path: 'src/b.ts', rule: 'DEF-8', detail: 'Second gap.' },
      ],
    });
    const result = mergeReviewRounds(prior, current);

    expect(result.opinion).toMatchObject({
      round: 3,
      state: 'INDETERMINATE',
      checked: ['src/a.ts', 'src/b.ts'],
      riskPlan: 'Inspect the state transition before reviewing findings.',
    });
    expect(result.opinion.files).toEqual([
      makeFixture<ReviewFileResult>(BASE_FILE, {
        result: 'skipped',
        reason: 'Diff could not be read.',
      }),
      makeFixture<ReviewFileResult>(BASE_FILE, { path: 'src/b.ts' }),
    ]);
    expect(result.opinion.gaps).toEqual([
      { path: 'src/a.ts', rule: 'DEF-4', detail: 'First gap.' },
      { path: 'src/b.ts', rule: 'DEF-8', detail: 'Second gap.' },
    ]);
  });

  it('pads canonical IDs to at least three digits for large group IDs', () => {
    const findings = Array.from({ length: 1_000 }, (_, index) =>
      makeFixture<ReviewFinding>(BASE_FINDING, {
        existingCode: `return stale${String(index)};`,
      }),
    );
    const result = mergeReviewRounds(
      makeOpinion(1, { group: '100' }),
      makeOpinion(2, { group: '100', findings }),
    );

    expect(result.opinion.findings[0].id).toBe('R100-001');
    expect(result.opinion.findings[998].id).toBe('R100-999');
    expect(result.opinion.findings[999].id).toBe('R100-1000');
  });
});
