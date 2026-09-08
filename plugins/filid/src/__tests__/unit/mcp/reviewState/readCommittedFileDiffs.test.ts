import { beforeEach, describe, expect, it, vi } from 'vitest';

import { batchDiffPaths } from '../../../../mcp/tools/reviewState/handlers/utils/batchDiffPaths.js';
import { readCommittedFileDiffs } from '../../../../mcp/tools/reviewState/handlers/utils/readCommittedFileDiffs.js';
import { executeReviewGit } from '../../../../mcp/tools/reviewState/hash/executeReviewGit.js';

vi.mock('../../../../mcp/tools/reviewState/hash/executeReviewGit.js', () => ({
  executeReviewGit: vi.fn(),
}));

const ROOT = '/repo';
const RANGE = ['base..HEAD'];

const section = (header: string, body = 'x') =>
  `${header}\n--- a/f\n+++ b/f\n@@ -1 +1 @@\n-${body}\n+${body}!\n`;

describe('batchDiffPaths', () => {
  it('splits by count for short paths', () => {
    const paths = Array.from({ length: 401 }, (_, i) => `src/f${i}.ts`);
    const batches = batchDiffPaths(paths);
    expect(batches.map((batch) => batch.length)).toEqual([200, 200, 1]);
    expect(batches.flat()).toEqual(paths);
  });

  it('splits by command-line length before the count bound', () => {
    const paths = Array.from(
      { length: 300 },
      (_, i) => `src/${'d'.repeat(295)}${String(i).padStart(3, '0')}.ts`,
    );
    const batches = batchDiffPaths(paths);
    expect(batches.length).toBeGreaterThanOrEqual(4);
    for (const batch of batches)
      expect(
        batch.reduce((sum, p) => sum + p.length + 3, 0),
      ).toBeLessThanOrEqual(24_000);
    expect(batches.flat()).toEqual(paths);
  });

  it('keeps an oversized single path in a batch of its own', () => {
    const long = 'x'.repeat(30_000);
    expect(batchDiffPaths(['a.ts', long, 'b.ts'])).toEqual([
      ['a.ts'],
      [long],
      ['b.ts'],
    ]);
  });
});

describe('readCommittedFileDiffs', () => {
  beforeEach(() => {
    vi.mocked(executeReviewGit).mockReset();
  });

  it('reads a batch in one process and maps a silent path to empty text', async () => {
    const a = section('diff --git a/a.ts b/a.ts');
    vi.mocked(executeReviewGit).mockResolvedValueOnce(a);
    const diffs = await readCommittedFileDiffs(ROOT, RANGE, ['a.ts', 'b.ts']);
    expect(diffs.get('a.ts')).toBe(a);
    expect(diffs.get('b.ts')).toBe('');
    expect(executeReviewGit).toHaveBeenCalledTimes(1);
    expect(executeReviewGit).toHaveBeenCalledWith(ROOT, [
      'diff',
      '--no-renames',
      'base..HEAD',
      '--',
      'a.ts',
      'b.ts',
    ]);
  });

  it('re-reads every unattributed path when a section could not be attributed', async () => {
    const a = section('diff --git a/a.ts b/a.ts');
    const quoted = section(
      'diff --git "a/\\355\\225\\234.ts" "b/\\355\\225\\234.ts"',
    );
    vi.mocked(executeReviewGit)
      .mockResolvedValueOnce(a + quoted)
      .mockResolvedValueOnce(quoted)
      .mockResolvedValueOnce('');
    const diffs = await readCommittedFileDiffs(ROOT, RANGE, [
      'a.ts',
      '한.ts',
      'gone.ts',
    ]);
    expect(diffs.get('a.ts')).toBe(a);
    expect(diffs.get('한.ts')).toBe(quoted);
    expect(diffs.get('gone.ts')).toBe('');
    expect(vi.mocked(executeReviewGit).mock.calls.slice(1)).toEqual([
      [ROOT, ['diff', '--no-renames', 'base..HEAD', '--', '한.ts']],
      [ROOT, ['diff', '--no-renames', 'base..HEAD', '--', 'gone.ts']],
    ]);
  });

  it('spawns nothing for an empty roster', async () => {
    expect((await readCommittedFileDiffs(ROOT, RANGE, [])).size).toBe(0);
    expect(executeReviewGit).not.toHaveBeenCalled();
  });
});
