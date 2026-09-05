import { describe, expect, it, vi } from 'vitest';

import { executeReviewGit } from '../../../../mcp/tools/reviewState/hash/executeReviewGit.js';
import { readChangeContext } from '../../../../mcp/tools/reviewState/scope/readChangeContext.js';

vi.mock('../../../../mcp/tools/reviewState/hash/executeReviewGit.js', () => ({
  executeReviewGit: vi.fn(),
}));

describe('readChangeContext', () => {
  it('limits generated commit context to 30 non-merge log lines and adds numstat totals', async () => {
    vi.mocked(executeReviewGit).mockResolvedValue(
      Array.from({ length: 35 }, (_, i) => `hash${i}\tsubject${i}`).join('\n'),
    );
    const result = await readChangeContext({
      projectRoot: '/project',
      baseCommit: 'base',
      files: [
        {
          path: 'a.ts',
          change: 'M',
          insertions: 3,
          deletions: 2,
          binary: false,
        },
      ],
    });
    expect(result.changeContext).toContain('hash29\tsubject29');
    expect(result.changeContext).not.toContain('hash30\tsubject30');
    expect(result.changeContext).toContain(
      '1 files changed, 3 insertions(+), 2 deletions(-)',
    );
    expect(executeReviewGit).toHaveBeenCalledWith(
      '/project',
      expect.arrayContaining([
        'log',
        '--no-merges',
        '--format=%h%x09%s',
        'base..HEAD',
      ]),
    );
  });
});
