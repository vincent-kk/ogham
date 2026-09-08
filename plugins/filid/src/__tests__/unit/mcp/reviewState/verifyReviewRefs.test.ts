import { beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyReviewRefs } from '../../../../mcp/tools/reviewState/assess/verifyReviewRefs.js';
import { executeReviewGit } from '../../../../mcp/tools/reviewState/hash/executeReviewGit.js';

vi.mock('../../../../mcp/tools/reviewState/hash/executeReviewGit.js', () => ({
  executeReviewGit: vi.fn(),
}));

const ROOT = '/repo';
const SHA = 'a'.repeat(40);

describe('verifyReviewRefs', () => {
  beforeEach(() => {
    vi.mocked(executeReviewGit).mockReset();
  });

  it('verifies every candidate through one batch-check process', async () => {
    vi.mocked(executeReviewGit).mockResolvedValueOnce(
      ['origin/main missing', `${SHA} commit 123`, 'master ambiguous', ''].join(
        '\n',
      ),
    );
    const resolved = await verifyReviewRefs(ROOT, [
      'origin/main',
      'main',
      'master',
    ]);
    expect([...resolved]).toEqual(['main']);
    expect(executeReviewGit).toHaveBeenCalledTimes(1);
    expect(executeReviewGit).toHaveBeenCalledWith(
      ROOT,
      ['cat-file', '--batch-check'],
      'origin/main\nmain\nmaster\n',
    );
  });

  it('falls back to per-candidate verification when the answer count differs', async () => {
    vi.mocked(executeReviewGit)
      .mockResolvedValueOnce(`${SHA} commit 123\n`)
      .mockRejectedValueOnce(new Error('exit 128'))
      .mockResolvedValueOnce(`${SHA}\n`);
    const resolved = await verifyReviewRefs(ROOT, ['origin/main', 'main']);
    expect([...resolved]).toEqual(['main']);
    expect(vi.mocked(executeReviewGit).mock.calls.slice(1)).toEqual([
      [ROOT, ['rev-parse', '--verify', '--quiet', 'origin/main']],
      [ROOT, ['rev-parse', '--verify', '--quiet', 'main']],
    ]);
  });

  it('never sends a candidate that cannot travel on one input line', async () => {
    vi.mocked(executeReviewGit).mockResolvedValue(`${SHA}\n`);
    const resolved = await verifyReviewRefs(ROOT, ['main', 'bad\nref']);
    expect([...resolved]).toEqual(['main', 'bad\nref']);
    for (const call of vi.mocked(executeReviewGit).mock.calls)
      expect(call[1][0]).toBe('rev-parse');
  });

  it('spawns nothing for an empty candidate list', async () => {
    expect((await verifyReviewRefs(ROOT, [])).size).toBe(0);
    expect(executeReviewGit).not.toHaveBeenCalled();
  });
});
