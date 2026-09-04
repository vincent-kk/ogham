import { describe, expect, it } from 'vitest';

import { chunkUnits } from '../../../../mcp/tools/reviewState/chunk/chunkUnits.js';
import type { ReviewScopeFile } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/** Shared reviewable-file fields for chunking fixtures. */
const REVIEWABLE_FILE: Omit<
  ReviewScopeFile,
  'path' | 'insertions' | 'deletions'
> = {
  change: 'M',
  binary: false,
  role: 'source',
  owner: 'src',
  skipReason: null,
  rules: ['default'],
  repositoryRules: [],
};

/**
 * Render one replacement hunk with deterministic changed lines.
 *
 * @param start One-based old and new starting line.
 * @param count Removed and inserted line count.
 * @param label Stable content label for the generated lines.
 * @returns Unified-diff hunk text without a trailing newline.
 */
function renderReplacementHunk(
  start: number,
  count: number,
  label: string,
): string {
  const removed = `-${label}-old\n`.repeat(count).trimEnd();
  const added = `+${label}-new\n`.repeat(count).trimEnd();
  return `@@ -${start},${count} +${start},${count} @@\n${removed}\n${added}`;
}

/**
 * Render a complete path-scoped unified diff around ordered hunks.
 *
 * @param path Project-relative file path used in diff headers.
 * @param hunks Ordered unified-diff hunk bodies.
 * @returns Complete newline-terminated path-scoped diff.
 */
function renderDiff(path: string, hunks: readonly string[]): string {
  return [
    `diff --git a/${path} b/${path}`,
    `--- a/${path}`,
    `+++ b/${path}`,
    ...hunks,
    '',
  ].join('\n');
}

describe('chunkUnits', () => {
  it('keeps exactly 800 churn in one unchunked unit', () => {
    const path = 'src/boundary.ts';
    const chunks = chunkUnits(
      { ...REVIEWABLE_FILE, path, insertions: 400, deletions: 400 },
      renderDiff(path, [renderReplacementHunk(1, 400, 'boundary')]),
      800,
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].unit).toMatchObject({
      path,
      chunk: null,
      churn: 800,
      hunks: [{ oldStart: 1, oldEnd: 400, newStart: 1, newEnd: 400 }],
      diffPath: '',
    });
    expect(chunks[0].diffText).toContain('@@ -1,400 +1,400 @@');
  });

  it('packs ordered hunks up to the cap before starting the next unit', () => {
    const path = 'src/packed.ts';
    const chunks = chunkUnits(
      { ...REVIEWABLE_FILE, path, insertions: 4, deletions: 4 },
      renderDiff(path, [
        renderReplacementHunk(1, 2, 'first'),
        renderReplacementHunk(10, 1, 'second'),
        renderReplacementHunk(20, 1, 'third'),
      ]),
      6,
    );

    expect(chunks.map(({ unit }) => unit.churn)).toEqual([6, 2]);
    expect(chunks.map(({ unit }) => unit.chunk)).toEqual([
      { index: 1, total: 2 },
      { index: 2, total: 2 },
    ]);
    expect(chunks.map(({ unit }) => unit.hunks.length)).toEqual([2, 1]);
    expect(chunks[0].diffText).toContain('@@ -10,1 +10,1 @@');
    expect(chunks[0].diffText).not.toContain('@@ -20,1 +20,1 @@');
    expect(chunks[1].diffText).toContain('@@ -20,1 +20,1 @@');
  });

  it('splits a deletion-heavy oversized hunk with recomputed headers and preserved churn', () => {
    const path = 'src/deletions.ts';
    const hunk = [
      '@@ -10,7 +20,2 @@ section',
      '-old-10',
      '-old-11',
      '-old-12',
      '-old-13',
      '-old-14',
      '-old-15',
      '-old-16',
      '+new-20',
      '+new-21',
    ].join('\n');
    const chunks = chunkUnits(
      { ...REVIEWABLE_FILE, path, insertions: 2, deletions: 7 },
      renderDiff(path, [hunk]),
      3,
    );

    expect(chunks.map(({ unit }) => unit.churn)).toEqual([3, 3, 3]);
    expect(chunks.reduce((sum, { unit }) => sum + unit.churn, 0)).toBe(9);
    expect(chunks.map(({ unit }) => unit.hunks)).toEqual([
      [{ oldStart: 10, oldEnd: 12, newStart: 20, newEnd: 19 }],
      [{ oldStart: 13, oldEnd: 15, newStart: 20, newEnd: 19 }],
      [{ oldStart: 16, oldEnd: 16, newStart: 20, newEnd: 21 }],
    ]);
    expect(chunks.map(({ diffText }) => diffText)).toEqual([
      expect.stringContaining('@@ -10,3 +19,0 @@ section'),
      expect.stringContaining('@@ -13,3 +19,0 @@ section'),
      expect.stringContaining('@@ -16,1 +20,2 @@ section'),
    ]);
  });
});
