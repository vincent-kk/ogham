import { mkdtempSync, rmSync } from 'node:fs';

import { portableJoin, tmp } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REVIEW_BRIEF_INLINE_DIFF_LIMIT } from '../../../../constants/reviewState.js';
import { readInlineReviewDiffs } from '../../../../mcp/tools/reviewState/diff/readInlineReviewDiffs.js';

import { buildReviewHandoffFixture } from './helpers/buildReviewHandoffFixture.js';
import { writeReviewStateFixtureFile } from './helpers/writeReviewStateFixtureFile.js';

/** Isolated root for byte-budget checks on materialized group diffs. */
let root: string;
beforeEach(() => {
  root = mkdtempSync(portableJoin(tmp(), 'inline-diffs-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('readInlineReviewDiffs', () => {
  it.each([0, 1])(
    'bounds combined UTF-8 diff bytes at the limit plus %i',
    (extra) => {
      const { state, paths } = buildReviewHandoffFixture(root);
      const group = state.groups[0]!;
      const first = '가'.repeat(1000);
      const second = 'x'.repeat(
        REVIEW_BRIEF_INLINE_DIFF_LIMIT - Buffer.byteLength(first) + extra,
      );
      writeReviewStateFixtureFile(
        paths.reviewDirectory,
        group.units[0]!.diffPath,
        first,
      );
      writeReviewStateFixtureFile(
        paths.reviewDirectory,
        group.units[1]!.diffPath,
        second,
      );
      expect(readInlineReviewDiffs(paths, group)).toEqual(
        extra
          ? null
          : [
              { unit: group.units[0], diffText: first },
              { unit: group.units[1], diffText: second },
            ],
      );
    },
  );

  it('reports a missing required materialized diff', () => {
    const { state, paths } = buildReviewHandoffFixture(root);
    expect(() => readInlineReviewDiffs(paths, state.groups[0]!)).toThrow(
      'Review unit diff is missing',
    );
  });
});
