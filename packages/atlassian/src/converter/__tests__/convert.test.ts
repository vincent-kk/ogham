import { describe, expect, it } from 'vitest';

import { convert } from '../index.js';

describe('convert', () => {
  it('returns the input unchanged when formats match', () => {
    expect(convert('markdown', 'markdown', '# Hello')).toBe('# Hello');
  });

  it('converts markdown into an ADF JSON string', () => {
    const result = JSON.parse(convert('markdown', 'adf', '# Hello'));

    expect(result).toEqual({
      type: 'doc',
      attrs: { version: 1 },
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    });
  });

  it('converts ADF JSON into storage through markdown composition', () => {
    const adf = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    });

    expect(convert('adf', 'storage', adf)).toBe('<p>Hello</p>');
  });

  it('converts storage into ADF JSON through markdown composition', () => {
    const result = JSON.parse(convert('storage', 'adf', '<p>Hello</p>'));

    expect(result).toEqual({
      type: 'doc',
      attrs: { version: 1 },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    });
  });

  it('throws for unsupported conversions', () => {
    expect(() => convert('wiki', 'markdown', 'h1. Title')).toThrow(
      'Unsupported conversion: wiki > markdown',
    );
  });
});
