import { describe, expect, it, vi } from 'vitest';

import { REVIEW_CHANGE_CONTEXT_LIMIT } from '../../../../constants/reviewState.js';
import { executeReviewGit } from '../../../../mcp/tools/reviewState/hash/executeReviewGit.js';
import { readChangeContext } from '../../../../mcp/tools/reviewState/scope/readChangeContext.js';
import { REVIEW_HANDOFF_SEED_SCHEMA } from '../../../../mcp/tools/reviewState/scope/reviewHandoffSeedSchema.js';

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
    expect(result.handoff).toBeNull();
    expect(result.diagnostics).toEqual([]);
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

  it('parses a trailing handoff before limiting a body longer than 8000 characters', async () => {
    const handoff = REVIEW_HANDOFF_SEED_SCHEMA.parse({
      schema: 1,
      snapshotHash: 'snapshot-hash',
      scope: ['src'],
      documentSync: 'no-change',
      repaired: 0,
      recorded: [],
      truncated: 0,
    });
    const block = `<!-- filid:handoff v1\n${JSON.stringify(handoff)}\n-->`;
    const input = { projectRoot: '/project', baseCommit: 'base', files: [] };
    const result = await readChangeContext({
      ...input,
      changeContext: `${'x'.repeat(REVIEW_CHANGE_CONTEXT_LIMIT + 100)}\n${block}`,
    });
    expect(result).toEqual({
      changeContext: 'x'.repeat(REVIEW_CHANGE_CONTEXT_LIMIT),
      handoff,
      diagnostics: [
        {
          code: 'review-change-context-truncated',
          message: 'Change context was truncated to 8000 characters.',
        },
      ],
    });
    const boundedRemainder = `${'x'.repeat(REVIEW_CHANGE_CONTEXT_LIMIT - 1)}\n`;
    expect(
      await readChangeContext({
        ...input,
        changeContext: `${boundedRemainder}${block}`,
      }),
    ).toEqual({
      changeContext: boundedRemainder,
      handoff,
      diagnostics: [],
    });
  });

  it('keeps caller text sanitization unchanged when no handoff block is present', async () => {
    vi.mocked(executeReviewGit).mockClear();
    const result = await readChangeContext({
      projectRoot: '/project',
      baseCommit: 'base',
      files: [],
      changeContext: '\u0000Before\r\nAfter\rFinal\ttext\u0007',
    });
    expect(result).toEqual({
      changeContext: 'Before\nAfter\nFinal\ttext',
      handoff: null,
      diagnostics: [],
    });
    expect(executeReviewGit).not.toHaveBeenCalled();
  });
});
