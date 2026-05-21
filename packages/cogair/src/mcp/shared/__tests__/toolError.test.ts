import { describe, expect, it } from 'vitest';

import { toolError } from '../toolError.js';

describe('toolError', () => {
  it('serializes Error.message and marks isError true', () => {
    const r = toolError(new Error('boom'));
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toBe('Error: boom');
  });

  it('stringifies non-Error values', () => {
    expect(toolError('bad input').content[0].text).toBe('Error: bad input');
  });
});
