import { describe, expect, it } from 'vitest';

import { renderCodeSpan } from '../../../../mcp/tools/reviewState/render/utils/renderCodeSpan.js';

describe('renderCodeSpan', () => {
  it('carries Markdown syntax through without escaping it', () => {
    expect(renderCodeSpan('src/my_module/(a)[b].ts')).toBe(
      '`src/my_module/(a)[b].ts`',
    );
  });

  it('closes a value holding backticks with a longer fence', () => {
    expect(renderCodeSpan('``a`')).toBe('``` ``a` ```');
  });

  it('flattens line endings and control characters onto one line', () => {
    expect(renderCodeSpan('a\r\nb\tc')).toBe('`a b c`');
  });

  it('renders an empty value as a space rather than an empty fence', () => {
    expect(renderCodeSpan('')).toBe('` `');
  });
});
