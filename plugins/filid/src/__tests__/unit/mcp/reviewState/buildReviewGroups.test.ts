import { describe, expect, it } from 'vitest';

import { buildReviewGroups } from '../../../../mcp/tools/reviewState/group/buildReviewGroups.js';
import { resolveReviewGroupStem } from '../../../../mcp/tools/reviewState/group/utils/resolveReviewGroupStem.js';
import type { ReviewUnit } from '../../../../mcp/tools/reviewState/state/reviewGroupTypes.js';
import type { ReviewScopeFile } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/** Shared build limits that individual grouping cases override narrowly. */
const DEFAULT_OPTIONS = {
  rounds: 2,
  groupFileLimit: 10,
  groupChurnLimit: 800,
  planChurnLimit: 50,
} as const;

/** Shared reviewable-file fields for grouping fixtures. */
const REVIEWABLE_FILE: Omit<
  ReviewScopeFile,
  'path' | 'insertions' | 'deletions' | 'owner'
> = {
  change: 'M',
  binary: false,
  role: 'source',
  skipReason: null,
  rules: ['default'],
  repositoryRules: [],
};

/** Shared hunk range for grouping fixtures whose diff content is irrelevant. */
const UNIT_HUNK = { oldStart: 1, oldEnd: 1, newStart: 1, newEnd: 1 } as const;

/** Shared FCA candidate fields for deterministic assignment fixtures. */
const FCA_CANDIDATE = {
  source: 'structure',
  category: 'structure',
  severity: 'warning',
  rule: 'boundary-import',
  message: 'The changed import crosses the module boundary.',
} as const;

/**
 * Build one reviewable scope-file fixture.
 *
 * @param path Project-relative changed path.
 * @param insertions Inserted-line count used for file churn.
 * @param deletions Deleted-line count used for file churn.
 * @param owner Owning fractal path, or null for an unowned file.
 * @returns Complete reviewable scope-file fixture.
 */
function makeFile(
  path: string,
  insertions: number,
  deletions = 0,
  owner: string | null = 'src',
): ReviewScopeFile {
  return { ...REVIEWABLE_FILE, path, insertions, deletions, owner };
}

/**
 * Build one review unit with an optional chunk identity.
 *
 * @param path Project-relative path owned by the unit.
 * @param churn Changed-line count assigned to the unit.
 * @param chunk Optional sequential chunk identity.
 * @returns Complete review-unit fixture with one stable hunk.
 */
function makeUnit(
  path: string,
  churn: number,
  chunk: ReviewUnit['chunk'] = null,
): ReviewUnit {
  return { path, change: 'M', chunk, churn, hunks: [UNIT_HUNK], diffPath: '' };
}

describe('buildReviewGroups', () => {
  it('collapses explicit locales without collapsing dotted code suffixes', () => {
    expect(resolveReviewGroupStem('foo.api.ts')).not.toBe(
      resolveReviewGroupStem('foo.ts'),
    );
    expect(resolveReviewGroupStem('foo.ko.json')).toBe(
      resolveReviewGroupStem('foo.en.json'),
    );
  });

  it('clamps the small-group shortcut to the configured file cap', () => {
    const units = ['src/a.ts', 'src/b.ts', 'src/c.ts'].map((path) =>
      makeUnit(path, 10),
    );
    const files = units.map(({ path }) => makeFile(path, 10));
    const groups = buildReviewGroups({
      ...DEFAULT_OPTIONS,
      units,
      files,
      candidates: [],
      groupFileLimit: 2,
    });

    expect(groups.map(({ units: grouped }) => grouped.length)).toEqual([2, 1]);
    expect(groups.every(({ units: grouped }) => grouped.length <= 2)).toBe(
      true,
    );
  });

  it('clamps the small-group shortcut and normal groups to the churn cap', () => {
    const units = ['src/a.ts', 'src/b.ts'].map((path) => makeUnit(path, 60));
    const files = units.map(({ path }) => makeFile(path, 60));
    const groups = buildReviewGroups({
      ...DEFAULT_OPTIONS,
      units,
      files,
      candidates: [],
      groupChurnLimit: 100,
    });

    expect(groups.map(({ churn }) => churn)).toEqual([60, 60]);
    expect(groups.every(({ churn }) => churn <= 100)).toBe(true);
  });

  it('keeps equal normalized stems adjacent before applying the file cap', () => {
    const paths = ['src/widget.ts', 'src/widget.time.ts', 'src/widget.test.ts'];
    const units = paths.map((path) => makeUnit(path, 10));
    const groups = buildReviewGroups({
      ...DEFAULT_OPTIONS,
      units,
      files: paths.map((path) => makeFile(path, 10)),
      candidates: [],
      groupFileLimit: 2,
    });

    expect(
      groups.map(({ units: grouped }) => grouped.map(({ path }) => path)),
    ).toEqual([
      ['src/widget.test.ts', 'src/widget.ts'],
      ['src/widget.time.ts'],
    ]);
  });

  it('isolates file chunks and chains each group to the previous chunk', () => {
    const path = 'src/large.ts';
    const units = [1, 2, 3].map((index) =>
      makeUnit(path, 100, { index, total: 3 }),
    );
    const groups = buildReviewGroups({
      ...DEFAULT_OPTIONS,
      units,
      files: [makeFile(path, 150, 150)],
      candidates: [],
      groupChurnLimit: 100,
    });

    expect(groups.map(({ units: grouped }) => grouped)).toEqual(
      units.map((unit) => [unit]),
    );
    expect(groups.map(({ dependsOn }) => dependsOn)).toEqual([
      [],
      ['01'],
      ['02'],
    ]);
  });

  it('derives planRequired from whole-file churn for every chunk', () => {
    const path = 'src/planned.ts';
    const units = [1, 2, 3].map((index) =>
      makeUnit(path, 30, { index, total: 3 }),
    );
    const groups = buildReviewGroups({
      ...DEFAULT_OPTIONS,
      units,
      files: [makeFile(path, 45, 45)],
      candidates: [],
      groupChurnLimit: 30,
      planChurnLimit: 50,
    });

    expect(groups).toHaveLength(3);
    expect(groups.every(({ planRequired }) => planRequired)).toBe(true);
  });

  it('assigns exact-path, owner, and fallback candidates exactly once', () => {
    const paths = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const units = paths.map((path) => makeUnit(path, 10));
    const groups = buildReviewGroups({
      ...DEFAULT_OPTIONS,
      units,
      files: paths.map((path) => makeFile(path, 10, 0, 'src')),
      candidates: [
        {
          ...FCA_CANDIDATE,
          id: 'FCA-001',
          path: 'src/b.ts',
          scope: 'src/b.ts',
        },
        { ...FCA_CANDIDATE, id: 'FCA-002', path: 'src', scope: 'src' },
        {
          ...FCA_CANDIDATE,
          id: 'FCA-003',
          path: 'elsewhere',
          scope: 'elsewhere',
        },
      ],
      groupFileLimit: 1,
    });

    expect(groups[0].candidateIds).toEqual(['FCA-002', 'FCA-003']);
    expect(groups[1].candidateIds).toEqual(['FCA-001']);
    expect(groups.flatMap(({ candidateIds }) => candidateIds).sort()).toEqual([
      'FCA-001',
      'FCA-002',
      'FCA-003',
    ]);
  });

  it('creates a rounds-zero group when candidates exist without reviewable units', () => {
    const groups = buildReviewGroups({
      ...DEFAULT_OPTIONS,
      units: [],
      files: [],
      candidates: [
        { ...FCA_CANDIDATE, id: 'FCA-001', path: 'src', scope: 'src' },
      ],
    });

    expect(groups).toEqual([
      expect.objectContaining({
        id: '01',
        units: [],
        rounds: 0,
        candidateIds: ['FCA-001'],
        briefPath: 'briefs/review-01.md',
        skeletonPath: 'opinions/review-01.r1.json',
        opinionPath: 'opinions/review-01.json',
        verifyBriefPath: 'briefs/verify-01.md',
        verifyPath: 'opinions/verify-01.json',
      }),
    ]);
  });

  it('keeps numeric creation order when group IDs cross from 99 to 100', () => {
    const paths = Array.from(
      { length: 100 },
      (_, index) => `src/file-${String(index + 1).padStart(3, '0')}.ts`,
    );
    const groups = buildReviewGroups({
      ...DEFAULT_OPTIONS,
      units: paths.map((path) => makeUnit(path, 1)),
      files: paths.map((path) => makeFile(path, 1)),
      candidates: [],
      groupFileLimit: 1,
      groupChurnLimit: 1,
    });

    expect(groups).toHaveLength(100);
    expect(groups[98].id).toBe('99');
    expect(groups[99].id).toBe('100');
  });
});
