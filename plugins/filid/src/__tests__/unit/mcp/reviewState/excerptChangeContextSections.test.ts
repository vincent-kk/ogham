import { describe, expect, it } from 'vitest';

import { excerptChangeContextSections } from '../../../../mcp/tools/reviewState/scope/excerptChangeContextSections.js';

describe('excerptChangeContextSections', () => {
  it('returns matched sections in requested heading order', () => {
    const result = excerptChangeContextSections(
      [
        '## Review notes',
        'Review text',
        '## Changes',
        'Excluded change text',
        '## Summary',
        'Summary text',
        '## Contract',
        'Contract text',
      ].join('\n'),
      ['## Summary', '## Contract', '## Review notes'],
    );

    expect(result).toEqual({
      excerpt: [
        '## Summary',
        'Summary text',
        '',
        '## Contract',
        'Contract text',
        '',
        '## Review notes',
        'Review text',
      ].join('\n'),
      matched: true,
    });
  });

  it('ends a section immediately before a details block', () => {
    const result = excerptChangeContextSections(
      '## Summary\nSummary text\n<details open>\nExcluded details\n</details>',
      ['## Summary'],
    );

    expect(result.excerpt).toBe('## Summary\nSummary text');
    expect(result.matched).toBe(true);
  });

  it('ends a section immediately before an HTML comment', () => {
    const result = excerptChangeContextSections(
      '## Contract\nContract text\n<!-- hidden payload -->\nExcluded comment',
      ['## Contract'],
    );

    expect(result.excerpt).toBe('## Contract\nContract text');
    expect(result.matched).toBe(true);
  });

  it('recognizes CRLF template headings and normalizes matched sections', () => {
    const result = excerptChangeContextSections(
      '## Summary\r\nSummary text\r\n## Contract\r\nContract text\r\n',
      ['## Contract', '## Summary'],
    );

    expect(result).toEqual({
      excerpt: '## Contract\nContract text\n\n## Summary\nSummary text',
      matched: true,
    });
  });
});
