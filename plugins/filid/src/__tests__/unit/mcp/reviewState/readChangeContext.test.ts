import { describe, expect, it, vi } from 'vitest';

import {
  REVIEW_CHANGE_CONTEXT_LIMIT,
  REVIEW_CHANGE_CONTEXT_LOG_LIMIT,
} from '../../../../constants/reviewState.js';
import { executeReviewGit } from '../../../../mcp/tools/reviewState/hash/executeReviewGit.js';
import { readChangeContext } from '../../../../mcp/tools/reviewState/scope/readChangeContext.js';
import { REVIEW_HANDOFF_SEED_SCHEMA } from '../../../../mcp/tools/reviewState/scope/reviewHandoffSeedSchema.js';

vi.mock('../../../../mcp/tools/reviewState/hash/executeReviewGit.js', () => ({
  executeReviewGit: vi.fn(),
}));

describe('readChangeContext', () => {
  it('limits generated commit context to the non-merge log budget and adds numstat totals', async () => {
    vi.mocked(executeReviewGit).mockResolvedValue(
      Array.from(
        { length: REVIEW_CHANGE_CONTEXT_LOG_LIMIT + 5 },
        (_, i) => `hash${i}\tsubject${i}`,
      ).join('\n'),
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
    expect(result.changeContext).toContain(
      `hash${REVIEW_CHANGE_CONTEXT_LOG_LIMIT - 1}\tsubject${REVIEW_CHANGE_CONTEXT_LOG_LIMIT - 1}`,
    );
    expect(result.changeContext).not.toContain(
      `hash${REVIEW_CHANGE_CONTEXT_LOG_LIMIT}\tsubject${REVIEW_CHANGE_CONTEXT_LOG_LIMIT}`,
    );
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

  it('keeps only configured template sections in heading order', async () => {
    const result = await readChangeContext({
      projectRoot: '/project',
      baseCommit: 'base',
      files: [],
      changeContext: [
        '## Summary',
        'Summary text',
        '## Links',
        'Link text',
        '## Contract',
        'Contract text',
        '## Review notes',
        'Review text',
        '## Verification',
        'Verification text',
        '<details>',
        '<summary>Changes</summary>',
        'Changes text',
        '</details>',
        '<details>',
        '<summary>Work context</summary>',
        'Work context text',
        '</details>',
      ].join('\n'),
    });

    expect(result.changeContext).toBe(
      [
        '## Summary',
        'Summary text',
        '',
        '## Contract',
        'Contract text',
        '',
        '## Review notes',
        'Review text',
      ].join('\n'),
    );
    expect(result.changeContext).not.toContain('Changes text');
    expect(result.changeContext).not.toContain('Work context text');
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps untemplated caller text and reports one diagnostic', async () => {
    const changeContext = 'Unstructured summary\nwith supporting detail';
    const result = await readChangeContext({
      projectRoot: '/project',
      baseCommit: 'base',
      files: [],
      changeContext,
    });

    expect(result.changeContext).toBe(changeContext);
    expect(result.diagnostics).toEqual([
      {
        code: 'review-change-context-untemplated',
        message: 'Change context did not match any configured template section.',
      },
    ]);
  });

  it('limits an extracted template section to the change context budget', async () => {
    const result = await readChangeContext({
      projectRoot: '/project',
      baseCommit: 'base',
      files: [],
      changeContext: `## Summary\n${'x'.repeat(REVIEW_CHANGE_CONTEXT_LIMIT + 100)}`,
    });

    expect(result.changeContext).toHaveLength(REVIEW_CHANGE_CONTEXT_LIMIT);
    expect(result.diagnostics).toEqual([
      {
        code: 'review-change-context-truncated',
        message: 'Change context was truncated to 3000 characters.',
      },
    ]);
  });

  it('parses a trailing handoff before excerpting and limiting the body', async () => {
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
    const longRemainder = `## Summary\n${'x'.repeat(REVIEW_CHANGE_CONTEXT_LIMIT + 100)}`;
    const result = await readChangeContext({
      ...input,
      changeContext: `${longRemainder}\n${block}`,
    });
    expect(result).toEqual({
      changeContext: longRemainder.slice(0, REVIEW_CHANGE_CONTEXT_LIMIT),
      handoff,
      diagnostics: [
        {
          code: 'review-change-context-truncated',
          message: 'Change context was truncated to 3000 characters.',
        },
      ],
    });
    const heading = '## Summary\n';
    const boundedRemainder = `${heading}${'x'.repeat(
      REVIEW_CHANGE_CONTEXT_LIMIT - heading.length - 1,
    )}\n`;
    expect(
      await readChangeContext({
        ...input,
        changeContext: `${boundedRemainder}${block}`,
      }),
    ).toEqual({
      changeContext: boundedRemainder.trimEnd(),
      handoff,
      diagnostics: [],
    });
  });

  it('keeps caller text sanitization unchanged for a template section', async () => {
    vi.mocked(executeReviewGit).mockClear();
    const result = await readChangeContext({
      projectRoot: '/project',
      baseCommit: 'base',
      files: [],
      changeContext: '## Summary\r\n\u0000Before\r\nAfter\rFinal\ttext\u0007',
    });
    expect(result).toEqual({
      changeContext: '## Summary\nBefore\nAfter\nFinal\ttext',
      handoff: null,
      diagnostics: [],
    });
    expect(executeReviewGit).not.toHaveBeenCalled();
  });
});
