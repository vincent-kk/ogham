import { describe, expect, it } from 'vitest';

import { REVIEW_GROUP_CHURN_LIMIT } from '../../../../constants/reviewState.js';
import { FilidConfigSchema } from '../../../../core/infra/configLoader/index.js';
import { renderReviewBrief } from '../../../../mcp/tools/reviewState/brief/renderReviewBrief.js';
import { buildReviewGroups } from '../../../../mcp/tools/reviewState/group/buildReviewGroups.js';

import { buildReviewBriefInput } from './helpers/buildReviewBriefInput.js';

describe('review cost policy', () => {
  it('uses a 1024 changed-line default', () => {
    expect(REVIEW_GROUP_CHURN_LIMIT).toBe(1024);
  });

  it.each([
    { count: 4, churn: 10, expectedGroups: 1 },
    { count: 32, churn: 8, expectedGroups: 1 },
    { count: 200, churn: 1, expectedGroups: 7 },
    { count: 30, churn: 200, expectedGroups: 6 },
    { count: 12, churn: 0, expectedGroups: 1 },
  ])(
    'packs $count files at $churn churn without losing units',
    ({ count, churn, expectedGroups }) => {
      const seed = buildReviewBriefInput();
      const units = Array.from({ length: count }, (_, index) => ({
        ...seed.group.units[0]!,
        path: `src/file-${String(index).padStart(3, '0')}.ts`,
        churn,
      }));
      const files = units.map((unit) => ({
        ...seed.files[0]!,
        path: unit.path,
        insertions: churn,
        deletions: 0,
      }));
      const input = {
        units,
        files,
        candidates: [],
        rounds: 2,
        groupChurnLimit: 1024,
        planChurnLimit: 50,
      };
      const groups = buildReviewGroups(input);
      expect(groups).toHaveLength(expectedGroups);
      expect(groups.flatMap((group) => group.units)).toEqual(units);
      expect(
        groups.every(
          (group) => group.churn <= 1024 && group.units.length <= 32,
        ),
      ).toBe(true);
      expect(buildReviewGroups(input)).toEqual(groups);
      const fixed = buildReviewGroups({ ...input, groupFileLimit: 10 });
      expect(fixed.every((group) => group.units.length <= 10)).toBe(true);
      if (count === 200) expect(fixed).toHaveLength(20);
    },
  );

  it('keeps unrelated roster growth out of the reviewer input', () => {
    const input = buildReviewBriefInput();
    const baseline = renderReviewBrief(input);
    input.files = [
      ...input.files,
      ...Array.from({ length: 1000 }, (_, index) => ({
        ...input.files[0]!,
        path: `unrelated/file-${index}.ts`,
      })),
    ];
    const output = renderReviewBrief(input);
    expect(output).toContain('1001 other changed files');
    expect(output).toContain('session.md');
    expect(output).not.toContain('unrelated/file-');
    expect(
      Buffer.byteLength(output) - Buffer.byteLength(baseline),
    ).toBeLessThan(256);
    expect(input.files).toHaveLength(1003);
    expect(output).toContain('src/a.ts');
    expect(output).toContain('src/b.ts');
    expect(output).toContain('FCA-001');
    expect(output).toContain('Review every assigned unit.');
  });

  it.each([1, 12])(
    'accepts a review group budget of %s without fixing automatic sizing',
    (maxGroups) => {
      const parsed = FilidConfigSchema.parse({
        version: '2.0',
        adapters: { mode: 'auto', enabled: ['ecmascript'] },
        rules: {},
        review: { maxGroups },
      });
      expect(parsed.review).toEqual({ maxGroups });
    },
  );

  it.each([0, -1, 1.5])(
    'rejects the invalid review group budget %s',
    (maxGroups) => {
      expect(
        FilidConfigSchema.safeParse({
          version: '2.0',
          adapters: { mode: 'auto', enabled: ['ecmascript'] },
          rules: {},
          review: { maxGroups },
        }).success,
      ).toBe(false);
    },
  );
});
