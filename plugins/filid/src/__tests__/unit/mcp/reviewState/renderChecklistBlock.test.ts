import { describe, expect, it } from 'vitest';

import { renderChecklistBlock } from '../../../../mcp/tools/reviewState/render/renderChecklistBlock.js';

describe('renderChecklistBlock', () => {
  it('preserves a checklist-shaped heading inside untrusted change context', () => {
    const rendered = renderChecklistBlock(
      [
        '---',
        'review_schema: 7',
        '---',
        '',
        '## Change Context',
        '',
        'The pull request body includes this heading:',
        '',
        '## Review Checklist',
        '',
        'This is untrusted context, not the canonical checklist.',
        '',
        '## Review Checklist',
        '',
        '| stale | checklist |',
        '',
      ].join('\n'),
      [
        {
          path: 'src/value.ts',
          change: 'M',
          groups: ['01'],
          result: 'reviewed',
          reason: '',
        },
      ],
    );

    expect(rendered).toContain(
      '## Review Checklist\n\nThis is untrusted context, not the canonical checklist.',
    );
    expect(rendered).not.toContain('| stale | checklist |');
    expect(rendered).toContain('| src/value.ts | M | 01 | reviewed |  |');
  });
});
